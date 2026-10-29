import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getAdvisorCheckpoint } from "@/repositories/checkpoints/advisor";

/**
 * One checkpoint, for the curator running it.
 *
 * Not behind the project's space guard: a curator is not a member of the
 * project, and being named on the checkpoint is the whole of the right to read
 * it. Anything else is a 404 — a checkpoint they do not run must not even be
 * visible to them.
 */
export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const checkpoint = await getAdvisorCheckpoint(id, curator.id);

	return checkpoint ? json(checkpoint) : apiError.notFound();
});
