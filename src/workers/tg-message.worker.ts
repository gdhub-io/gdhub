import { Worker, Queue } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL!, {
	lazyConnect: true,
	maxRetriesPerRequest: null,
	db: 0,
})

export const tgMessageQueue = new Queue('tgMessageQueue', {
	connection,
	defaultJobOptions: {
		attempts: 2,
		backoff: {
			type: 'exponential',
			delay: 5000,
		},
	},
})

const worker = new Worker(
	'tgMessageQueue',
	async (job) => {
		const data = job?.data
		console.log('tgMessageQueue[worker]', data)
		console.log('Task executed successfully')
	},
	{
		connection,
		concurrency: 5,
		removeOnComplete: { count: 1000 },
		removeOnFail: { count: 5000 },
	}
)

export default worker
