import { NextAuthGuard } from '@/lib/api-middlewares'
import telegramQueue from '@/queues/telegram.queue'
import { CronExpressionBuilder } from 'natural-cron'
import { Post, createHandler } from 'next-api-decorators'

NextAuthGuard('api')
class ApiQueueStartupHandler {
	constructor() {}

	@Post()
	public async stratup() {
		const schedule = new CronExpressionBuilder()

		await telegramQueue.drain()

		await telegramQueue.add('new-project-reports', null, {
			jobId: 'last-project-reports',
			repeat: { pattern: schedule.atTime(process.env.QUEUE_PROJECT_REPORTS_TIME || '00:00').compile(), utc: true },
		})

		await telegramQueue.add('new-specialities', null, {
			jobId: 'last-specialities',
			repeat: { pattern: schedule.atTime(process.env.QUEUE_SPECIALITIES_TIME || '06:00').compile(), utc: true },
		})

		await telegramQueue.add('new-vacancies', null, {
			jobId: 'last-vacancies',
			repeat: { pattern: schedule.atTime(process.env.QUEUE_VACANCIES_TIME || '12:00').compile(), utc: true },
		})
	}
}

export default createHandler(ApiQueueStartupHandler)
