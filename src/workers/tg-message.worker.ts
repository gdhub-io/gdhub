import TelegramService from '@/services/telegram'
import { Worker, Queue, Processor } from 'bullmq'
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
	const workerHandler: Processor = async (job) => {
		const telegramBot = TelegramService.init()
		// let message: string | undefined = undefined

		if (job.name == 'new-project-reports') {
			await telegramBot.sendNewProjectReports({ inLastDays: 1 })
		}

		if (job.name == 'new-specialities') {
			await telegramBot.sendNewSpecialities({ inLastDays: 1 })
		}

		if (job.name == 'new-vacancies') {
			await telegramBot.sendNewVacancies({ inLastDays: 1 })
		}
	}

	const worker = new Worker('tgMessageQueue', workerHandler, {
		connection,
		concurrency: 5,
		removeOnComplete: { count: 1000 },
		removeOnFail: { count: 5000 },
	})

	worker.on('completed', (job) => {
		console.log(`${job.id} has completed!`)
	})

	worker.on('failed', (job, err) => {
		console.log(`${job?.id} has failed with ${err.message}`)
	})
}
