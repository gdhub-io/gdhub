import { getGDHubPrismaClient } from "@gdhub-io/gdhub-prisma";

// Queries slower than this are logged. `0` logs every query.
const SLOW_QUERY_MS = Number(process.env.DB_SLOW_QUERY_MS ?? 300);
const LOGGING_ENABLED = process.env.DB_QUERY_LOG !== "0";

// The package caches the client on globalThis, so `next dev` hot reloads reuse a
// single connection pool instead of opening a new one on every reload.
//
// The pool is set explicitly: Prisma 7 hands connection handling to the `pg`
// driver, whose defaults are max=10 and *no* acquire timeout — so once the pool
// is saturated a request waits forever instead of failing fast, unlike the 5s
// timeout Prisma 6 applied. Keep `max` × app instances below the Postgres
// `max_connections` budget.
const buildClient = () => {
	const client = getGDHubPrismaClient({
		pool: { max: 20, connectionTimeoutMillis: 5000 },
		log: LOGGING_ENABLED
			? [{ level: "query", emit: "event" }, "error"]
			: ["error"],
	});

	if (LOGGING_ENABLED) {
		// `$onLog`, not `$on`: Prisma pins `$on` to a non-configurable undefined
		// on any extended client, so touching it throws.
		client.$onLog("query", (event) => {
			if (event.duration < SLOW_QUERY_MS) return;
			// Params are deliberately left out — they carry user data.
			console.warn(`[db] ${Math.round(event.duration)}ms ${event.query}`);
		});
	}

	return client;
};

type Client = ReturnType<typeof buildClient>;

let client: Client | undefined;

const getClient = () => {
	client ??= buildClient();
	return client;
};

// Built on first use, not on import: the package throws when DATABASE_URL is
// missing, and merely importing this module (Storybook, the Playwright config,
// a unit test outside `dotenv --`) must not fail.
export const prisma = new Proxy({} as Client, {
	get(_target, property) {
		const value = getClient()[property as keyof Client];
		return typeof value === "function" ? value.bind(getClient()) : value;
	},
	has(_target, property) {
		return property in getClient();
	},
});
