import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { askAgain } from "@/repositories/checkpoints/curator-approval";

/** After a decline or a revoke: a fresh request to curate. */
export const POST = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const expert = user as SessionUser | undefined;
	if (!expert) return apiError.unauthorized();

	const result = await askAgain(expert.id);
	return result.ok ? json(result.curation) : apiError.badRequest(result.error);
});
