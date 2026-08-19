import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const tokenCache = new Map<string, unknown>();
vi.mock("../src/services/cache", () => ({
	cacheGet: async (key: string) => tokenCache.get(key),
	cacheSet: async (key: string, value: unknown) => {
		tokenCache.set(key, value);
	},
	cacheDelete: async (key: string) => {
		tokenCache.delete(key);
	},
}));

const DOMAIN = "mx.test";
const BASE = "https://mx.test";

type FetchCall = { url: string; init?: RequestInit };
let fetchCalls: FetchCall[] = [];
let respond: () => unknown;

function jsonResponse(data: unknown, status = 200) {
	return {
		ok: status < 400,
		status,
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
			return respond();
		}),
	);
});

beforeEach(() => {
	fetchCalls = [];
	tokenCache.clear();
	process.env.MATRIX_CHAT_APPSERVICE_TOKEN = "";
	respond = () => jsonResponse({ access_token: "token-1" });
});

function bodyOf(call: FetchCall) {
	return JSON.parse(call.init?.body as string);
}

describe("getMatrixUserToken", () => {
	it("bounds the lifetime of an admin-login token", async () => {
		const { getMatrixUserToken } = await import(
			"../src/services/matrix/session"
		);

		const before = Date.now();
		const token = await getMatrixUserToken("user1", "web_1");

		expect(token.accessToken).toBe("token-1");
		expect(fetchCalls[0].url).toContain(
			"/_synapse/admin/v1/users/%40user1%3Amx.test/login",
		);
		// Synapse hands out non-expiring tokens by default — never accept that.
		expect(bodyOf(fetchCalls[0]).valid_until_ms).toBeGreaterThan(before);
	});

	it("reuses a cached token instead of minting one per request", async () => {
		const { getMatrixUserToken } = await import(
			"../src/services/matrix/session"
		);

		await getMatrixUserToken("user1", "web_1");
		const second = await getMatrixUserToken("user1", "web_1");

		expect(second.accessToken).toBe("token-1");
		expect(fetchCalls).toHaveLength(1);
	});

	it("keeps a separate token per device", async () => {
		const { getMatrixUserToken } = await import(
			"../src/services/matrix/session"
		);

		await getMatrixUserToken("user1", "web_1");
		await getMatrixUserToken("user1", "svc_backend");

		expect(fetchCalls).toHaveLength(2);
	});

	it("logs in through the appservice when it is configured", async () => {
		process.env.MATRIX_CHAT_APPSERVICE_TOKEN = "as-token";
		respond = () =>
			jsonResponse({
				access_token: "real-token",
				device_id: "web_1",
				user_id: `@user1:${DOMAIN}`,
			});

		const { getMatrixUserToken } = await import(
			"../src/services/matrix/session"
		);

		const token = await getMatrixUserToken("user1", "web_1");

		expect(fetchCalls[0].url).toBe(`${BASE}/_matrix/client/v3/login`);
		expect(fetchCalls[0].init?.headers).toMatchObject({
			Authorization: "Bearer as-token",
		});
		expect(bodyOf(fetchCalls[0])).toMatchObject({
			type: "m.login.application_service",
			device_id: "web_1",
		});
		// A real device this time, straight from the homeserver.
		expect(token.deviceId).toBe("web_1");
	});
});

describe("revokeMatrixUserToken", () => {
	it("logs the token out on the homeserver and drops the cache", async () => {
		const { getMatrixUserToken, revokeMatrixUserToken } = await import(
			"../src/services/matrix/session"
		);

		await getMatrixUserToken("user1", "web_1");
		respond = () => jsonResponse({});
		await revokeMatrixUserToken("user1", "web_1");

		expect(fetchCalls[1].url).toBe(`${BASE}/_matrix/client/v3/logout`);
		expect(fetchCalls[1].init?.headers).toMatchObject({
			Authorization: "Bearer token-1",
		});
		expect(tokenCache.size).toBe(0);
	});

	it("treats an already-invalid token as success", async () => {
		const { getMatrixUserToken, revokeMatrixUserToken } = await import(
			"../src/services/matrix/session"
		);

		await getMatrixUserToken("user1", "web_1");
		respond = () => jsonResponse({ errcode: "M_UNKNOWN_TOKEN" }, 401);

		await expect(revokeMatrixUserToken("user1", "web_1")).resolves.toBeUndefined();
	});

	it("revokes the browser's own token when the cache lost it", async () => {
		const { revokeMatrixUserToken } = await import(
			"../src/services/matrix/session"
		);

		// Nothing cached — an evicted key or an unreachable Redis must not leave
		// a live credential behind.
		respond = () => jsonResponse({});
		await revokeMatrixUserToken("user1", "web_1", "token-from-browser");

		expect(fetchCalls[0].url).toBe(`${BASE}/_matrix/client/v3/logout`);
		expect(fetchCalls[0].init?.headers).toMatchObject({
			Authorization: "Bearer token-from-browser",
		});
	});

	it("does nothing when there is no session to end", async () => {
		const { revokeMatrixUserToken } = await import(
			"../src/services/matrix/session"
		);

		await revokeMatrixUserToken("user1", "web_1");

		expect(fetchCalls).toHaveLength(0);
	});
});
