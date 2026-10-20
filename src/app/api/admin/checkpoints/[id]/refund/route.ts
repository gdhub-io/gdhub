import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { REFUND_REASONS } from "@/lib/checkpoint-refund";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	issueCheckpointRefund,
	quoteCheckpointRefund,
} from "@/repositories/checkpoint-refund";

const RefundSchema = z.object({ reason: z.enum(REFUND_REASONS) });

/** What a refund would return, per reason — the admin's dialog reads it. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.view" }),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };
	const quote = await quoteCheckpointRefund(id);

	return quote ? json(quote) : apiError.notFound();
});

/** Sends the refund the server works out; the client names only the reason. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.manage" }),
	withValidation(RefundSchema),
)(async (_req, ctx, { user, body }) => {
	const admin = user as SessionUser | undefined;
	if (!admin) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { reason } = body as z.infer<typeof RefundSchema>;
	const result = await issueCheckpointRefund(id, reason, admin.id);

	if (result.ok) return json({ refunded: result.amount });
	if (result.error === "notFound") return apiError.notFound();
	if (result.error === "refundFailed") return apiError.internal(result.error);
	return apiError.badRequest(result.error);
});
