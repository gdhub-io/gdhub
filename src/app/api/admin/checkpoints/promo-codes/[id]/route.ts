import { AuditAction } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	checkoutGateway,
	PromoCodeMissingError,
	PromoCodeRefusedError,
} from "@/services/payments/gateway";
import { logPromoCodeChange } from "@/services/payments/promo-log";

// On and off is the only edit: a code's discount never changes once made.
const UpdateSchema = z.object({ active: z.boolean() });

export const PATCH = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(UpdateSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { active } = body as z.infer<typeof UpdateSchema>;

	try {
		const { provider, promoCodes } = checkoutGateway();
		const promo = await promoCodes.setActive(id, active);

		await logPromoCodeChange(
			provider,
			currentUser.id,
			AuditAction.UPDATE,
			promo,
			{
				active,
			},
		);

		return json(promo);
	} catch (error) {
		if (error instanceof PromoCodeMissingError) return apiError.notFound();
		// A code that expired, or whose code another active one now holds, cannot come back on.
		if (active && error instanceof PromoCodeRefusedError) {
			return json(
				{ error: "cannotActivate", statusCode: 409 },
				{ status: 409 },
			);
		}
		throw error;
	}
});
