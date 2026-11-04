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
	PromoCodeRefusedError,
	PromoCodeTakenError,
} from "@/services/payments/gateway";
import { logPromoCodeChange } from "@/services/payments/promo-log";

const CreateSchema = z
	.object({
		code: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z0-9]{3,24}$/),
		kind: z.enum(["percent", "amount"]),
		value: z.number().int().min(1),
		expiresAt: z
			.string()
			.datetime({ offset: true })
			.nullable()
			.optional()
			.refine((at) => !at || new Date(at).getTime() > Date.now(), {
				message: "expiresAt must be in the future",
			}),
		maxRedemptions: z.number().int().min(1).nullable().optional(),
		firstPurchaseOnly: z.boolean(),
	})
	// 100% is refused: a free checkpoint is given by an admin (GDHUB-40), not by a code.
	.refine((body) => body.kind !== "percent" || body.value <= 99, {
		path: ["value"],
		message: "A percent code takes 1–99%",
	});

type CreateBody = z.infer<typeof CreateSchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.view" }),
)(async () => {
	const { promoCodes } = checkoutGateway();

	return json({
		codes: await promoCodes.list(),
		firstPurchase: promoCodes.firstPurchase,
	});
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(CreateSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const input = body as CreateBody;

	try {
		const { provider, promoCodes } = checkoutGateway();
		const promo = await promoCodes.create({
			...input,
			firstPurchaseOnly: promoCodes.firstPurchase && input.firstPurchaseOnly,
		});

		await logPromoCodeChange(
			provider,
			currentUser.id,
			AuditAction.CREATE,
			promo,
			{
				kind: input.kind,
				value: input.value,
				expiresAt: promo.expiresAt,
				maxRedemptions: promo.maxRedemptions,
				firstPurchaseOnly: promo.firstPurchaseOnly,
			},
		);

		return json(promo);
	} catch (error) {
		if (error instanceof PromoCodeTakenError) {
			return json({ error: "codeTaken", statusCode: 409 }, { status: 409 });
		}
		if (error instanceof PromoCodeRefusedError) {
			return apiError.badRequest(error.message || "codeRefused");
		}
		throw error;
	}
});
