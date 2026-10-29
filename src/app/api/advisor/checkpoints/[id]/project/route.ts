import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getAdvisorProject } from "@/repositories/checkpoints/advisor";

/**
 * The project behind one of the curator's checkpoints. Reached through the
 * checkpoint, never by project id: the right to see it is being named on it.
 */
export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const project = await getAdvisorProject(id, curator.id);

	return project ? json(project) : apiError.notFound();
});
