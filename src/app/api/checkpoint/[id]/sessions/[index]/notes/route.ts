import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getCallNotes } from "@/repositories/checkpoints/call";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id, index } = (await ctx.params) as { id: string; index: string };

	const notes = await getCallNotes(id, Number(index), caller.id);
	return notes ? json(notes) : apiError.notFound();
});
