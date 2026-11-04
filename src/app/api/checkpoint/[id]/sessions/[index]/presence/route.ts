import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getCallPresence } from "@/services/checkpoints/flows/call";

/** Who of the call is in its room now; polled by the call page while the room is open. */
export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id, index } = (await ctx.params) as { id: string; index: string };

	const presence = await getCallPresence(id, Number(index), caller.id);
	return presence ? json(presence) : apiError.notFound();
});
