import { NextAuthGuard } from '@/lib/api-middlewares'
import TelegramService from '@/services/telegram'
import { Job } from 'bullmq'
import { Body, Post, createHandler } from 'next-api-decorators'

NextAuthGuard('api')
class ApiQueueTelegramHandler {
	constructor() {}

	@Post()
	public async workerProcessor(@Body() job: Job<any, any, string>) {
		// jobs from main app
		if (job.data.app == undefined) {
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
		}

		// jobs from experts app
		if (job.data.app == 'experts') {
			const telegramBot = TelegramService.init(process.env.APP_EXPERTS_TELEGRAM_BOT_TOKEN as string)

			if (job.name == 'consultation-request') {
				await telegramBot.sendConsultationRequest(job.data)
			}
		}

		return { success: true }
	}
}

export default createHandler(ApiQueueTelegramHandler)
