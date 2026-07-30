import { getGDHubPrismaClient } from "@gdhub-io/gdhub-prisma";

// The package caches the client on globalThis, so `next dev` hot reloads reuse a
// single connection pool instead of opening a new one on every reload.
export const prisma = getGDHubPrismaClient();
