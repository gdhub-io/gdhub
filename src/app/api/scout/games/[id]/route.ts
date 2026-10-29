import { apiError, json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { getProjectCardOverview } from "@/repositories/scout/project-card";

/**
 * The card's header and the facts Overview leads with. Everything below it —
 * team, files, activity, workflow, reviews — is its own request, so opening a
 * card costs one small read and the tabs pay for themselves.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "scout.games.view" }),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };
	const project = await getProjectCardOverview(id);

	if (!project) return apiError.notFound("Project not found");

	return json(project);
});
