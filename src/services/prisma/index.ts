import { getGDHubPrismaClient } from "@gdhub-io/gdhub-prisma";

// The package caches the client on globalThis, so `next dev` hot reloads reuse a
// single connection pool instead of opening a new one on every reload.
//
// The pool is set explicitly: Prisma 7 hands connection handling to the `pg`
// driver, whose defaults are max=10 and *no* acquire timeout — so once the pool
// is saturated a request waits forever instead of failing fast, unlike the 5s
// timeout Prisma 6 applied. Keep `max` × app instances below the Postgres
// `max_connections` budget.
export const prisma = getGDHubPrismaClient({
	pool: { max: 20, connectionTimeoutMillis: 5000 },
});
