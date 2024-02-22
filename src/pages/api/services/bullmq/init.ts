import { env } from '@/helpers/env'
import { redisConnectionIsReady } from '@/services/redis'
import { matchingSpecAndProjWorkerRunning } from '@/workers/matching.worker'
import { TgMessageWorkerRunning, tgMessageQueueInit } from '@/workers/tg-message.worker'
import { Get, createHandler } from 'next-api-decorators'

// @NextAuthGuard('api')
class ApiBullMQInitHandler {
	constructor() {}

	@Get()
	public async init() {
		const redisResult = await redisConnectionIsReady()

		if (!redisResult) return { message: 'Redis is not ready' }

		const tgMessageQueue = tgMessageQueueInit()
		TgMessageWorkerRunning()
		matchingSpecAndProjWorkerRunning()

		if (!(await tgMessageQueue.getJob('new-project-reports'))) {
			await tgMessageQueue.add('new-project-reports', null, {
				jobId: 'new-project-reports',
				repeat: { pattern: env('QUEUE_PROJECT_REPORTS_CRON'), utc: true },
			})
		}

		if (!(await tgMessageQueue.getJob('new-specialities'))) {
			await tgMessageQueue.add('new-specialities', null, {
				jobId: 'new-specialities',
				repeat: { pattern: env('QUEUE_SPECIALITIES_CRON'), utc: true },
			})
		}

		if (!(await tgMessageQueue.getJob('new-vacancies'))) {
			await tgMessageQueue.add('new-vacancies', null, {
				jobId: 'new-vacancies',
				repeat: { pattern: env('QUEUE_VACANCIES_CRON'), utc: true },
			})
		}

		console.log('Run Telegram Message Worker')
	}
}

export default createHandler(ApiBullMQInitHandler)
