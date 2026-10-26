import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { approvePlan } from "@/repositories/checkpoint-plan-edit";

/** With the AI curator, on day 1 or day 15: the author is done with the plan, and it locks. */
export const POST = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const refusal = await approvePlan(id, caller.id);
	if (refusal === "notFound") return apiError.notFound();
	if (refusal === "forbidden" || refusal === "planClosed") {
		return apiError.forbidden(refusal);
	}
	if (refusal) return apiError.badRequest(refusal);
	return json({ ok: true });
});
