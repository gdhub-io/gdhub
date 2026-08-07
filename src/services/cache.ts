import type Redis from "ioredis";
import { redisConnect } from "@/services/redis";

/**
 * A key/value cache over the Redis this app already runs for its queues.
 *
 * Every operation is best-effort by design. A cache exists to save work, so an
 * unreachable Redis has to cost latency and nothing else — never a failed
 * request. Callers get the same answer either way and do not have to guard.
 */

/**
 * One long-lived client for the process, the way the queues do it. Connecting
 * per call would open a TCP connection on every read and leak it whenever a
 * command threw before the cleanup ran.
 *
 * `undefined` means "not tried yet", `null` means "tried and unusable" — the
 * difference is what stops a missing REDIS_URL from being retried on every
 * single call.
 */
let client: Redis | null | undefined;

function getClient(): Redis | null {
	if (client !== undefined) return client;

	try {
		client = redisConnect({
			maxRetriesPerRequest: 1,
			// Fail the command rather than queue it forever while Redis is down.
			enableOfflineQueue: false,
		});
	} catch (error) {
		// `redisConnect` throws when REDIS_URL is absent.
		console.error("[cache] unavailable, running without it", error);
		client = null;
	}

	return client;
}

/** The cached value, or `undefined` on a miss, a parse failure or an outage. */
export async function cacheGet<T>(key: string): Promise<T | undefined> {
	const redis = getClient();
	if (!redis) return undefined;

	try {
		const raw = await redis.get(key);
		return raw === null ? undefined : (JSON.parse(raw) as T);
	} catch (error) {
		console.error(`[cache] read failed for ${key}`, error);
		return undefined;
	}
}

/** Stores a JSON-serialisable value. Silently does nothing when Redis is out. */
export async function cacheSet<T>(
	key: string,
	value: T,
	ttlSeconds: number,
): Promise<void> {
	const redis = getClient();
	if (!redis) return;

	try {
		await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
	} catch (error) {
		console.error(`[cache] write failed for ${key}`, error);
	}
}

/** Drops a key, so the next read goes back to the source. */
export async function cacheDelete(key: string): Promise<void> {
	const redis = getClient();
	if (!redis) return;

	try {
		await redis.del(key);
	} catch (error) {
		console.error(`[cache] delete failed for ${key}`, error);
	}
}

/**
 * Read-through: returns the cached value, or produces it and stores it.
 *
 * `produce` runs on a miss *and* on an outage, so the caller's code path is the
 * same in both cases and a broken cache degrades to no cache.
 */
export async function cached<T>(
	key: string,
	ttlSeconds: number,
	produce: () => Promise<T>,
): Promise<T> {
	const hit = await cacheGet<T>(key);
	if (hit !== undefined) return hit;

	const value = await produce();
	await cacheSet(key, value, ttlSeconds);

	return value;
}
