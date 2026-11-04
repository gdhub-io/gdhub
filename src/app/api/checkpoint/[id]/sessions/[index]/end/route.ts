import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { endCall } from "@/services/checkpoints/flows/call";

export const POST = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id, index } = (await ctx.params) as { id: string; index: string };

	return (await endCall(id, Number(index), caller.id))
		? json({ ended: true })
		: apiError.forbidden();
});
