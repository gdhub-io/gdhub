import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { listAdvisorCheckpoints } from "@/repositories/checkpoints/advisor";

/**
 * The checkpoints handed to whoever is asking.
 *
 * Scoped by the session and by nothing else: a curator is not a member of the
 * projects they curate, so there is no space to guard here — being the person
 * named on the checkpoint is the whole of the right to see it.
 */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	return json(await listAdvisorCheckpoints(curator.id));
});
