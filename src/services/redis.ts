import { env } from '@/helpers/env'
import Redis from 'ioredis'

declare global {
	// eslint-disable-next-line no-var
	var cachedRedisConnection: Redis
}

export const redisConnectionIsReady = async () => {
	let isReady = false

	try {
		await redisConnection.ping((err, result) => {
			isReady = result == 'PONG'
		})
	} catch (error) {
		isReady = false
	}

	return isReady
}

export const createRedisConnection = () => {
	const redis = new Redis(env('REDIS_URL'))

	redis.on('error', (error) => {
		console.error(`❌ Failed to connect to Redis server: ${error.message}`)
	})

	redis.on('ready', () => {
		console.log('✅ Redis Connected Successfully')
	})

	return redis
}

let redisConnection: Redis

if (process.env.NODE_ENV === 'production') {
	redisConnection = createRedisConnection()
} else {
	if (!global.cachedRedisConnection) {
		global.cachedRedisConnection = createRedisConnection()
	}

	redisConnection = global.cachedRedisConnection
}

export { redisConnection }
