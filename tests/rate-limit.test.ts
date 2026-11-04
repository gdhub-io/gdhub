import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheIncrement = vi.fn();

vi.mock("@/services/cache", () => ({
	cacheIncrement: (...args: unknown[]) => cacheIncrement(...args),
}));

const { limitAiCalls, limitRequests, rateLimit } = await import(
	"@/lib/rate-limit"
);
const { RATE_LIMITS } = await import("@/config/rate-limits");
const AI = RATE_LIMITS.ai;

beforeEach(() => {
	vi.clearAllMocks();
});

describe("rateLimit", () => {
	it("keeps one counter per bucket, window and user", async () => {
		cacheIncrement.mockResolvedValue({ count: 1, ttl: 60 });

		await expect(rateLimit("goal-check", "u1", AI)).resolves.toBeNull();
		expect(cacheIncrement.mock.calls).toEqual([
			["rate:goal-check:60:u1", 60],
			["rate:goal-check:3600:u1", 3600],
		]);
	});

	it("lets the last request within a window through and refuses the next", async () => {
		cacheIncrement.mockResolvedValueOnce({ count: 10, ttl: 12 });
		cacheIncrement.mockResolvedValueOnce({ count: 10, ttl: 900 });
		await expect(rateLimit("b", "u1", AI)).resolves.toBeNull();

		cacheIncrement.mockResolvedValueOnce({ count: 11, ttl: 12 });
		cacheIncrement.mockResolvedValueOnce({ count: 11, ttl: 900 });
		await expect(rateLimit("b", "u1", AI)).resolves.toBe(12);
	});

	it("waits for the longest exceeded window", async () => {
		cacheIncrement.mockResolvedValueOnce({ count: 11, ttl: 20 });
		cacheIncrement.mockResolvedValueOnce({ count: 61, ttl: 1500 });

		await expect(rateLimit("b", "u1", AI)).resolves.toBe(1500);
	});

	it("fails open while Redis is out", async () => {
		cacheIncrement.mockResolvedValue(undefined);

		await expect(rateLimit("b", "u1", AI)).resolves.toBeNull();
	});

	it("allows 10 a minute and 60 an hour for AI calls", () => {
		expect(AI).toEqual([
			{ limit: 10, seconds: 60 },
			{ limit: 60, seconds: 3600 },
		]);
	});
});

describe("limitAiCalls", () => {
	it("answers 429 with retryAfter in the body and the header", async () => {
		cacheIncrement.mockResolvedValueOnce({ count: 11, ttl: 42 });
		cacheIncrement.mockResolvedValueOnce({ count: 11, ttl: 3000 });

		const response = await limitAiCalls("entry-about", "u1");

		expect(response?.status).toBe(429);
		expect(response?.headers.get("Retry-After")).toBe("42");
		expect(await response?.json()).toEqual({
			error: "rateLimited",
			statusCode: 429,
			retryAfter: 42,
		});
	});
});

describe("limitRequests", () => {
	const windows = [{ limit: 3, seconds: 600 }];

	it("counts against the windows it is given", async () => {
		cacheIncrement.mockResolvedValue({ count: 3, ttl: 500 });

		await expect(limitRequests("team-invite", "u1", windows)).resolves.toBeNull();
		expect(cacheIncrement).toHaveBeenCalledWith("rate:team-invite:600:u1", 600);
	});

	it("refuses past the limit", async () => {
		cacheIncrement.mockResolvedValue({ count: 4, ttl: 500 });

		const response = await limitRequests("team-invite", "u1", windows);

		expect(response?.status).toBe(429);
		expect(response?.headers.get("Retry-After")).toBe("500");
	});

	it("fails open while Redis is out", async () => {
		cacheIncrement.mockResolvedValue(undefined);

		await expect(limitRequests("team-invite", "u1", windows)).resolves.toBeNull();
	});
});
