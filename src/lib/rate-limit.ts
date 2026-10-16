import { NextResponse } from "next/server";
import { cacheIncrement } from "@/services/cache";

export type RateWindow = { limit: number; seconds: number };

/** Per user, for endpoints that spend a model call on every request. */
export const AI_RATE_LIMITS: RateWindow[] = [
	{ limit: 10, seconds: 60 },
	{ limit: 60, seconds: 60 * 60 },
];

/**
 * Fixed-window limits over Redis. Returns the seconds until the tightest
 * exceeded window reopens, or null when the request may go through.
 *
 * Fails open: an unreachable Redis must not lock users out of the form.
 */
export const rateLimit = async (
	bucket: string,
	subject: string,
	windows: RateWindow[] = AI_RATE_LIMITS,
): Promise<number | null> => {
	const hits = await Promise.all(
		windows.map((window) =>
			cacheIncrement(
				`rate:${bucket}:${window.seconds}:${subject}`,
				window.seconds,
			).then((hit) => ({ window, hit })),
		),
	);

	const waits = hits.flatMap(({ window, hit }) =>
		hit && hit.count > window.limit ? [hit.ttl] : [],
	);

	return waits.length ? Math.max(...waits) : null;
};

export const tooManyRequests = (retryAfter: number) =>
	NextResponse.json(
		{ error: "rateLimited", statusCode: 429, retryAfter },
		{ status: 429, headers: { "Retry-After": String(retryAfter) } },
	);

/** The 429 to return, or null when the user is within the limits. */
export const limitAiCalls = async (bucket: string, userId: string) => {
	const retryAfter = await rateLimit(bucket, userId);
	return retryAfter === null ? null : tooManyRequests(retryAfter);
};
