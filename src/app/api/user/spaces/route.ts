import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getCachedUserSpaces } from "@/repositories/user/spaces";

/** The spaces the switcher in the header offers. */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	return json(await getCachedUserSpaces(currentUser.id));
});
