import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheIncrement = vi.fn();

vi.mock("@/services/cache", () => ({
	cacheIncrement: (...args: unknown[]) => cacheIncrement(...args),
}));

const { AI_RATE_LIMITS, limitAiCalls, rateLimit } = await import(
	"@/lib/rate-limit"
);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("rateLimit", () => {
	it("keeps one counter per bucket, window and user", async () => {
		cacheIncrement.mockResolvedValue({ count: 1, ttl: 60 });

		await expect(rateLimit("goal-check", "u1")).resolves.toBeNull();
		expect(cacheIncrement.mock.calls).toEqual([
			["rate:goal-check:60:u1", 60],
			["rate:goal-check:3600:u1", 3600],
		]);
	});

	it("lets the last request within a window through and refuses the next", async () => {
		cacheIncrement.mockResolvedValueOnce({ count: 10, ttl: 12 });
		cacheIncrement.mockResolvedValueOnce({ count: 10, ttl: 900 });
		await expect(rateLimit("b", "u1")).resolves.toBeNull();

		cacheIncrement.mockResolvedValueOnce({ count: 11, ttl: 12 });
		cacheIncrement.mockResolvedValueOnce({ count: 11, ttl: 900 });
		await expect(rateLimit("b", "u1")).resolves.toBe(12);
	});

	it("waits for the longest exceeded window", async () => {
		cacheIncrement.mockResolvedValueOnce({ count: 11, ttl: 20 });
		cacheIncrement.mockResolvedValueOnce({ count: 61, ttl: 1500 });

		await expect(rateLimit("b", "u1")).resolves.toBe(1500);
	});

	it("fails open while Redis is out", async () => {
		cacheIncrement.mockResolvedValue(undefined);

		await expect(rateLimit("b", "u1")).resolves.toBeNull();
	});

	it("allows 10 a minute and 60 an hour for AI calls", () => {
		expect(AI_RATE_LIMITS).toEqual([
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
