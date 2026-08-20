import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/cache", () => ({
	cacheClaim: vi.fn(),
}));

const request = (headers: Record<string, string>) =>
	({ headers: new Headers(headers) }) as any;

const VISITOR = { "x-forwarded-for": "1.2.3.4", "user-agent": "Firefox" };

/**
 * The module memoises the day's salt, so every test needs its own instance —
 * otherwise the first one to run fixes the salt for all the others.
 */
const load = async () => {
	vi.resetModules();
	// `resetModules` gives a fresh module (and so a fresh memo) but reuses the
	// mock instance, whose call count would otherwise carry across tests.
	vi.clearAllMocks();

	const { cacheClaim } = await import("../src/services/cache");
	const { resolveViewerKey } = await import("../src/services/viewer-identity");

	(cacheClaim as any).mockResolvedValue("salt-of-the-day");

	return { cacheClaim: cacheClaim as any, resolveViewerKey };
};

describe("resolveViewerKey", () => {
	beforeEach(() => {
		vi.useRealTimers();
	});

	it("gives the same key to the same visitor twice", async () => {
		const { resolveViewerKey } = await load();

		const first = await resolveViewerKey(request(VISITOR));
		const second = await resolveViewerKey(request(VISITOR));

		expect(first?.viewerKey).toBe(second?.viewerKey);
	});

	it("separates visitors that differ only by user agent", async () => {
		const { resolveViewerKey } = await load();

		const a = await resolveViewerKey(request(VISITOR));
		const b = await resolveViewerKey(
			request({ ...VISITOR, "user-agent": "Safari" }),
		);

		expect(a?.viewerKey).not.toBe(b?.viewerKey);
	});

	it("keys a signed-in viewer off the account, not the connection", async () => {
		const { resolveViewerKey } = await load();

		const home = await resolveViewerKey(request(VISITOR), "user-1");
		const phone = await resolveViewerKey(
			request({ "x-forwarded-for": "9.9.9.9", "user-agent": "Safari" }),
			"user-1",
		);

		expect(home?.viewerKey).toBe(phone?.viewerKey);
	});

	it("fetches the day's salt once, however many views it keys", async () => {
		const { cacheClaim, resolveViewerKey } = await load();

		await resolveViewerKey(request(VISITOR));
		await resolveViewerKey(request(VISITOR));
		await resolveViewerKey(request(VISITOR), "user-1");

		expect(cacheClaim).toHaveBeenCalledTimes(1);
	});

	it("stops recognising yesterday's visitor once the day rolls over", async () => {
		const { cacheClaim, resolveViewerKey } = await load();

		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-20T12:00:00.000Z"));
		const today = await resolveViewerKey(request(VISITOR));

		cacheClaim.mockResolvedValue("a-fresh-salt");
		vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
		const tomorrow = await resolveViewerKey(request(VISITOR));

		expect(today?.viewerKey).not.toBe(tomorrow?.viewerKey);
		expect(cacheClaim).toHaveBeenCalledTimes(2);
	});

	it("stores no part of the visitor in the key", async () => {
		const { resolveViewerKey } = await load();

		const viewer = await resolveViewerKey(request(VISITOR), "user-1");

		expect(viewer?.viewerKey).not.toContain("1.2.3.4");
		expect(viewer?.viewerKey).not.toContain("user-1");
		expect(viewer?.viewerKey).not.toContain("Firefox");
	});

	it("refuses to guess when Redis has no salt to give", async () => {
		const { cacheClaim, resolveViewerKey } = await load();
		cacheClaim.mockResolvedValue(undefined);

		expect(await resolveViewerKey(request({}))).toBeUndefined();
	});

	it("pins a view to midnight UTC of its day", async () => {
		const { resolveViewerKey } = await load();

		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-20T23:30:00.000Z"));

		const viewer = await resolveViewerKey(request(VISITOR));

		expect(viewer?.viewedOn.toISOString()).toBe("2026-08-20T00:00:00.000Z");
	});
});
