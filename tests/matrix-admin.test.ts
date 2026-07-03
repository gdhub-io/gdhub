import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The admin service talks to Synapse over plain HTTP — stub fetch and assert
// the wire protocol (power levels, threepids, pushers).

const DOMAIN = "mx.test";
const BASE = "https://mx.test";

type FetchCall = { url: string; init?: RequestInit };
let fetchCalls: FetchCall[] = [];
let fetchRoutes: Array<{
	match: (url: string, init?: RequestInit) => boolean;
	respond: () => unknown;
}> = [];

function respondJson(data: unknown) {
	return {
		ok: true,
		status: 200,
		json: async () => data,
		text: async () => JSON.stringify(data),
	};
}

beforeAll(() => {
	process.env.MATRIX_CHAT_BASE_URL = BASE;
	process.env.MATRIX_CHAT_SYNAPSE_ADMIN_TOKEN = "admin-token";
	process.env.MATRIX_CHAT_HOMESERVER_DOMAIN = DOMAIN;

	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string, init?: RequestInit) => {
			fetchCalls.push({ url: String(url), init });
			const route = fetchRoutes.find((r) => r.match(String(url), init));
			if (!route) throw new Error(`Unexpected fetch: ${url}`);
			return route.respond();
		}),
	);
});

beforeEach(() => {
	fetchCalls = [];
	fetchRoutes = [];
});

function stubRoomAdminFlow() {
	fetchRoutes.push(
		{
			// Room details -> creator
			match: (url) => url.includes("/_synapse/admin/v1/rooms/"),
			respond: () => respondJson({ creator: `@creator:${DOMAIN}` }),
		},
		{
			// Mint the creator's token
			match: (url) => url.includes("/login"),
			respond: () => respondJson({ access_token: "creator-token" }),
		},
		{
			match: (url) => url.includes("/state/m.room.power_levels"),
			respond: () => respondJson({ event_id: "$e" }),
		},
	);
}

function powerLevelsBody() {
	const call = fetchCalls.find((c) =>
		c.url.includes("/state/m.room.power_levels"),
	);
	expect(call).toBeDefined();
	// biome-ignore lint/style/noNonNullAssertion: asserted above
	return JSON.parse(call!.init?.body as string);
}

describe("room freeze / unfreeze power levels", () => {
	it("makeRoomReadOnly keeps the creator at PL 100 and blocks everyone else", async () => {
		stubRoomAdminFlow();
		const { makeRoomReadOnly } = await import("../src/services/matrix/admin");

		await makeRoomReadOnly("!room1");

		const body = powerLevelsBody();
		// The creator must stay at 100: Matrix auth rules forbid raising your own
		// level, so demoting the creator would make the freeze unrecoverable.
		expect(body.users).toEqual({ [`@creator:${DOMAIN}`]: 100 });
		expect(body.events_default).toBe(100);
		expect(body.users_default).toBe(0);
	});

	it("makeRoomWritable only lowers events_default — a change the creator may make", async () => {
		stubRoomAdminFlow();
		const { makeRoomWritable } = await import("../src/services/matrix/admin");

		await makeRoomWritable("!room1");

		const body = powerLevelsBody();
		expect(body.users).toEqual({ [`@creator:${DOMAIN}`]: 100 });
		expect(body.events_default).toBe(0);
	});
});

describe("ensureMatrixEmailNotifications", () => {
	it("short-circuits with ZERO requests when the email threepid is already bound", async () => {
		const { ensureMatrixEmailNotifications } = await import(
			"../src/services/matrix/admin"
		);

		const result = await ensureMatrixEmailNotifications(
			"user1",
			" User@Example.COM ",
			[{ medium: "email", address: "user@example.com" }],
		);

		expect(result).toEqual({ threepidBound: false, pusherCreated: false });
		expect(fetchCalls).toHaveLength(0);
	});

	it("binds the threepid and registers the m.email pusher for a fresh account", async () => {
		fetchRoutes.push(
			{
				match: (url, init) =>
					url.includes("/_synapse/admin/v2/users/") && init?.method === "PUT",
				respond: () => respondJson({}),
			},
			{
				match: (url) => url.includes("/pushers") && !url.includes("/set"),
				respond: () => respondJson({ pushers: [] }),
			},
			{
				match: (url) => url.includes("/login"),
				respond: () => respondJson({ access_token: "user-token" }),
			},
			{
				match: (url) => url.includes("/pushers/set"),
				respond: () => respondJson({}),
			},
		);

		const { ensureMatrixEmailNotifications } = await import(
			"../src/services/matrix/admin"
		);

		const result = await ensureMatrixEmailNotifications(
			"user1",
			"User@Example.com",
			[],
		);

		expect(result).toEqual({ threepidBound: true, pusherCreated: true });

		const threepidPut = fetchCalls.find(
			(c) =>
				c.url.includes("/_synapse/admin/v2/users/") &&
				c.init?.method === "PUT",
		);
		// biome-ignore lint/style/noNonNullAssertion: asserted by the flow
		expect(JSON.parse(threepidPut!.init?.body as string).threepids).toEqual([
			{ medium: "email", address: "user@example.com" },
		]);

		const pusherSet = fetchCalls.find((c) => c.url.includes("/pushers/set"));
		expect(pusherSet).toBeDefined();
		// biome-ignore lint/style/noNonNullAssertion: asserted above
		const pusherBody = JSON.parse(pusherSet!.init?.body as string);
		expect(pusherBody.kind).toBe("email");
		expect(pusherBody.app_id).toBe("m.email");
		expect(pusherBody.pushkey).toBe("user@example.com");
	});
});
