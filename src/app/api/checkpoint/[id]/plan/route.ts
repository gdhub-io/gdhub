import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { changePlan } from "@/repositories/checkpoints/plan-edit";
import { type PlanChange, PlanChangeSchema } from "@/schemas/checkpoint";

/**
 * One change to the plan, made on call 1 or call 3. Not behind the space guard —
 * the curator has no role in the project; the right comes from the checkpoint.
 */
export const PATCH = pipe(
	withAuth({ mode: "user" }),
	withValidation(PlanChangeSchema),
)(async (_req, ctx, { user, body }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const refused = await changePlan(id, caller.id, body as PlanChange);
	if (refused === "notFound") return apiError.notFound();
	if (refused === "forbidden" || refused === "planClosed") {
		return apiError.forbidden(refused);
	}
	return refused ? apiError.badRequest(refused) : json({ saved: true });
});
