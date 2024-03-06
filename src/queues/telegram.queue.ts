import { redisConnect } from '@/services/redis'
import { Queue } from 'bullmq'

export const telegramQueue = new Queue('telegram', {
	connection: redisConnect(),
	defaultJobOptions: {
		attempts: 2,
		backoff: {
			type: 'exponential',
			delay: 5000,
		},
	},
})

export default telegramQueue
