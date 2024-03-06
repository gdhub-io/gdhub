import { redisConnect } from '@/services/redis'
import { Queue } from 'bullmq'

export const matchingQueue = new Queue('matching', {
	connection: redisConnect(),
	defaultJobOptions: {
		attempts: 2,
		backoff: {
			type: 'exponential',
			delay: 5000,
		},
	},
})

export default matchingQueue
