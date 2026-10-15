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
	isInvalidRequestError,
	isMissingResourceError,
	logPromoCodeChange,
	setPromoCodeActive,
} from "@/services/stripe/promo-codes";

// On and off is the only edit: Stripe never changes a coupon's discount.
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
		const promo = await setPromoCodeActive(id, active);

		await logPromoCodeChange(currentUser.id, AuditAction.UPDATE, promo, {
			active,
		});

		return json(promo);
	} catch (error) {
		if (isMissingResourceError(error)) return apiError.notFound();
		// Stripe refuses to turn back on a code that expired or whose code another active one now holds.
		if (active && isInvalidRequestError(error)) {
			return json(
				{ error: "cannotActivate", statusCode: 409 },
				{ status: 409 },
			);
		}
		throw error;
	}
});
