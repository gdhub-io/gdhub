import { env } from '@/helpers/env'
import Redis from 'ioredis'

declare global {
	// eslint-disable-next-line no-var
	var cachedRedisConnection: Redis
}

const createRedisConnection = () => {
	const redis = new Redis(env('REDIS_URL'), {
		lazyConnect: true,
		maxRetriesPerRequest: null,
		db: 0,
	})

	redis.on('error', (error) => {
		console.error(`❌ Failed to connect to Redis server: ${error.message}`)
	})

	redis.on('connect', () => {
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
