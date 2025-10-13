import Redis, { type RedisOptions } from "ioredis";
import { env } from "@/helpers/env";

export const redisConnect = (options?: RedisOptions) => {
	const redis = new Redis(env("REDIS_URL"), {
		enableReadyCheck: false,
		...options,
	});

	redis.on("error", (error) => {
		console.error(`❌ Failed to connect to Redis server: ${error.message}`);
	});

	// redis.on('ready', () => {
	// console.debug('✅ Redis Connected Successfully')
	// })

	return redis;
};

export const redisConnectionIsReady = async () => {
	let isReady = false;

	try {
		await redisConnect({ maxRetriesPerRequest: 1 }).ping((err, result) => {
			isReady = result == "PONG";
		});
	} catch (error) {
		isReady = false;
	}

	return isReady;
};
