import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { loadUserSpaces } from "@/repositories/user-spaces";
import { cached } from "@/services/cache";

/** Cache key for one user's switcher list. Exported so writes can drop it. */
export const userSpacesCacheKey = (userId: string) => `user-spaces:${userId}`;

/**
 * The spaces the switcher in the header offers.
 *
 * Read on every header render, so it is cached — but briefly: joining a project
 * or creating an event should show up without the person wondering why it has
 * not. Writes drop the key outright; the TTL is the backstop for the ones that
 * forget to.
 */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const spaces = await cached(userSpacesCacheKey(currentUser.id), 60, () =>
		loadUserSpaces(currentUser.id),
	);

	return json(spaces);
});
