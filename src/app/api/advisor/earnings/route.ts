import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { curatorEarnings } from "@/repositories/checkpoints/curator-earnings";

/** Frame 13.4: the asking curator's own fees and payouts, nobody else's. */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	return json(await curatorEarnings(curator.id));
});
