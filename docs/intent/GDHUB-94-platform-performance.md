# GDHUB-94 — Platform performance

[Linear](https://linear.app/gdhub/issue/GDHUB-94) · intent written 2026-10-15

## Want

Pages and API calls stop paying for work that has already been done: the
signed-in user is read from the database once per sync interval, not once per
`auth()` call; a server render reads the session once; the browser gets the
session with the page instead of asking for it after hydration. Later slices
cut what every page downloads (chat SDK, both translation files) and let public
pages and dictionaries be served from cache.

## Why now

The audit in the issue found that the jwt callback's 5-minute resync is never
saved — `auth()` in a server component or route handler drops the refreshed
cookie — so once a token is five minutes old, every `auth()` call runs four
queries, and for users without a Matrix account an HTTP call to Synapse. A
protected page calls `auth()` three or four times per render, a guarded API
route twice.

## Constraints

- What a session contains stays the same; nothing reading `session.user`
  changes.
- Freshness stays as designed: user data may lag by at most
  `USER_SYNC_INTERVAL_MS`, and `resyncSession()` still forces an immediate
  re-read (it is the `trigger === "update"` path).
- Redis is best-effort (`@/services/cache`): with Redis down, behaviour is
  today's, only slower.
- Public pages must stay statically renderable — the root layout does not read
  the session.

## Done when (slice 1)

- [ ] Within the sync interval, `auth()` with a stale cookie costs one Redis
      read, not four queries; sign-in and `resyncSession()` still read the
      database and refresh the cache.
- [ ] A user whose Matrix account the jwt callback provisions gets
      `matrixUserId` stored, so Synapse is not called again.
- [ ] Server components, layouts and gates share one session read per render;
      `withSpaceGuard` reuses the user `withAuth` already resolved.
- [ ] Inside the authenticated app, `useSession()` has the session on first
      render — queries gated on it start without waiting for
      `/api/auth/session`.

## Out of scope (later slices, see the issue)

- Space access caching (S3), public page ISR and API caching (S4–S5), query
  batching (S6).
- Client bundle work (C1–C8).
