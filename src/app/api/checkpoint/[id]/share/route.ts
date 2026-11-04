import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { shareCardOf } from "@/services/checkpoints/flows/share";

/** The verdict share card's content; the first request writes the curator's line (GDHUB-144). */
export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const card = await shareCardOf(id, caller.id);
	return card ? json(card) : apiError.notFound();
});
