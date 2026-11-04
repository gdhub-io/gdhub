import { NextResponse } from "next/server";
import { RATE_LIMITS, type RateWindow } from "@/config/rate-limits";
import { cacheIncrement } from "@/services/cache";

/**
 * Fixed-window limits over Redis. Returns the seconds until the tightest
 * exceeded window reopens, or null when the request may go through.
 *
 * Fails open: an unreachable Redis must not lock users out of the form.
 */
export const rateLimit = async (
	bucket: string,
	subject: string,
	windows: RateWindow[],
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

const tooManyRequests = (retryAfter: number) =>
	NextResponse.json(
		{ error: "rateLimited", statusCode: 429, retryAfter },
		{ status: 429, headers: { "Retry-After": String(retryAfter) } },
	);

/** The 429 to return, or null when the subject is within the limits. */
export const limitRequests = async (
	bucket: string,
	subject: string,
	windows: RateWindow[],
) => {
	const retryAfter = await rateLimit(bucket, subject, windows);
	return retryAfter === null ? null : tooManyRequests(retryAfter);
};

export const limitAiCalls = (bucket: string, userId: string) =>
	limitRequests(bucket, userId, RATE_LIMITS.ai);
