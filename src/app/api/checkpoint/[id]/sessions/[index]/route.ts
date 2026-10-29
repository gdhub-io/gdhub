import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getCall } from "@/repositories/checkpoints/call";

/**
 * The call as the curator or the team sees it. Not behind the space guard —
 * the curator has no role in the project; the right comes from the checkpoint.
 * The team polls it while waiting for the curator.
 */
export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id, index } = (await ctx.params) as { id: string; index: string };

	const call = await getCall(id, Number(index), caller.id);
	return call ? json(call) : apiError.notFound();
});
