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
 */
let client: Redis | null | undefined;
let connecting: Promise<Redis | null> | undefined;

/**
 * The client, once its socket is actually up.
 *
 * Connecting is asynchronous, so the first command of a process would other-
 * wise be sent into a socket that does not exist yet and die with "Stream
 * isn't writeable" — every cold start lost its first cache hit. Waiting for
 * the connection fixes that WITHOUT re-enabling the offline queue, which would
 * make commands hang for the whole reconnect loop while Redis is down.
 *
 * A failed connect is not remembered: the next call tries again, so a Redis
 * that was restarting at boot does not disable the cache for the process life.
 */
async function getClient(): Promise<Redis | null> {
	if (client !== undefined) return client;
	if (connecting) return connecting;

	connecting = (async () => {
		// `redisConnect` throws when REDIS_URL is absent.
		const redis = redisConnect({
			maxRetriesPerRequest: 1,
			// Fail the command rather than queue it forever while Redis is down.
			enableOfflineQueue: false,
			lazyConnect: true,
		});
		await redis.connect();
		return redis;
	})()
		.then((redis) => {
			client = redis;
			return redis;
		})
		.catch((error) => {
			console.error("[cache] unavailable, running without it", error);
			return null;
		})
		.finally(() => {
			connecting = undefined;
		});

	return connecting;
}

/** The cached value, or `undefined` on a miss, a parse failure or an outage. */
export async function cacheGet<T>(key: string): Promise<T | undefined> {
	const redis = await getClient();
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
	const redis = await getClient();
	if (!redis) return;

	try {
		await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
	} catch (error) {
		console.error(`[cache] write failed for ${key}`, error);
	}
}

/**
 * Stores a value only if the key is free, and returns whichever value now holds
 * it — the one just written, or the one that was already there.
 *
 * `cacheSet` cannot express this: two processes racing to create the same key
 * would each overwrite the other, and a caller that derives something from the
 * stored value (a rotating salt, a lock token) would see it change underneath
 * them. Returns `undefined` only when Redis is unreachable.
 */
export async function cacheClaim(
	key: string,
	value: string,
	ttlSeconds: number,
): Promise<string | undefined> {
	const redis = await getClient();
	if (!redis) return undefined;

	try {
		const claimed = await redis.set(key, value, "EX", ttlSeconds, "NX");
		if (claimed) return value;

		return (await redis.get(key)) ?? undefined;
	} catch (error) {
		console.error(`[cache] claim failed for ${key}`, error);
		return undefined;
	}
}

/** Drops a key, so the next read goes back to the source. */
export async function cacheDelete(key: string): Promise<void> {
	const redis = await getClient();
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
