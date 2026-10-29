import { after } from "next/server";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { adviseOnPlan } from "@/services/checkpoints/flows/review";

/** The AI curator reads the tasks as saved; on day 1, once. */
export const POST = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const refusal = await adviseOnPlan(id, caller.id, new Date(), after);
	if (refusal === "notFound") return apiError.notFound();
	if (refusal === "forbidden" || refusal === "planClosed") {
		return apiError.forbidden(refusal);
	}
	if (refusal === "alreadyChecked" || refusal === "noTasks") {
		return apiError.badRequest(refusal);
	}
	if (refusal === "failed") return apiError.internal("adviceFailed");
	return json({ ok: true });
});
