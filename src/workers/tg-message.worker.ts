import TelegramService from '@/services/telegram'
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

export const TgMessageQueueWorkerRunning = () => {
	const worker = new Worker(
		'tgMessageQueue',
		async (job) => {
			const { message } = job?.data
			const chatId = process.env.TELEGRAM_CHAT_ID ? Number.parseInt(process.env.TELEGRAM_CHAT_ID) : undefined

			if (!chatId) throw Error('No target telegram chat data.')

			const telegramBot = TelegramService.init()
			await telegramBot.sendMessage({
				chatId,
				topicId: process.env.TELEGRAM_TOPIC_NEWS ? Number.parseInt(process.env.TELEGRAM_TOPIC_NEWS) : undefined,
				message,
			})
		},
		{
			connection,
			concurrency: 5,
			removeOnComplete: { count: 1000 },
			removeOnFail: { count: 5000 },
		}
	)

	worker.on('completed', (job) => {
		// update task status
		void (async () => {
			// await someFunction(job?.id, TaskStatus.COMPLETED)
		})()
		console.log(`${job.id} has completed!`)
	})

	worker.on('failed', (job, err) => {
		// update task status
		void (async () => {
			// await someFunction(job?.id, TaskStatus.FAILED)
		})()
		console.log(`${job?.id} has failed with ${err.message}`)
	})
}
