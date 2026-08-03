import type { UpdateSession } from "next-auth/react";

/**
 * Force the JWT to be re-read from the database.
 *
 * `useSession().update()` only POSTs to `/api/auth/session` — the request that
 * runs the `jwt` callback with `trigger: "update"` — when it is given an
 * argument. Called with no argument it is a plain GET, which returns the token
 * as it is cached (see `USER_SYNC_INTERVAL_MS` in `@/auth`). Writes made right
 * before it — finishing onboarding, editing the profile — would then stay
 * invisible to the proxy and to every server component for up to that interval.
 */
export const resyncSession = (update: UpdateSession) => update({});
