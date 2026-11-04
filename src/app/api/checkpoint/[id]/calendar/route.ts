import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getCheckpointCalendar } from "@/repositories/checkpoints/calendar";

/** Every date of the checkpoint, as its curator or one of its team sees them. */
export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const calendar = await getCheckpointCalendar(id, caller.id);
	return calendar ? json(calendar) : apiError.notFound();
});
