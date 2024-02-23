import { redisConnect } from '@/services/redis'
import TelegramService from '@/services/telegram'
import { Worker, Queue, Processor } from 'bullmq'

const workerProcessor: Processor = async (job) => {
	try {
		const telegramBot = TelegramService.init()

		if (job.name == 'new-project-reports') {
			await telegramBot.sendNewProjectReports({ inLastDays: 1 })
		}

		if (job.name == 'new-specialities') {
			await telegramBot.sendNewSpecialities({ inLastDays: 1 })
		}

		if (job.name == 'new-vacancies') {
			await telegramBot.sendNewVacancies({ inLastDays: 1 })
		}

		return { success: true }
	} catch (error: any) {
		return { success: false, error: error?.message }
	}
}

export const tgMessageQueue = new Queue('tgMessageQueue', {
	connection: redisConnect({ enableReadyCheck: true, maxRetriesPerRequest: 1 }),
	defaultJobOptions: {
		attempts: 2,
		backoff: {
			type: 'exponential',
			delay: 5000,
		},
	},
})

export const tgMessageWorkerRun = () => {
	const worker = new Worker('tgMessageQueue', workerProcessor, {
		connection: redisConnect({ maxRetriesPerRequest: null }),
		concurrency: 5,
		removeOnComplete: { count: 1000 },
		removeOnFail: { count: 5000 },
	})

	worker.on('completed', async (job) => {
		console.log(`Job completed for ${job.id}`)
	})
	worker.on('failed', async (job, err) => {
		console.error(`${job?.id} has failed with ${err.message}`)
	})
	worker.on('stalled', (str) => {
		console.log(`Job stalled: ${str}`)
	})

	console.log('Workers for tgMessageQueue is running.')
}
