import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getEntryStatus } from "@/repositories/checkpoint-entry";

/** One read drives the whole hub at `/checkpoint/new`; the order rule is the client's. */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	return json(await getEntryStatus(currentUser.id));
});
