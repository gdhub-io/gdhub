import { AvailableLocales } from '@/config/locale'
import QueueBrokerLog from '@/decorators/QueueBrokerLog'
import { NextAuthGuard } from '@/lib/api-middlewares'
import TelegramService from '@/services/telegram'
import { Job } from 'bullmq'
import { Body, Post, createHandler } from 'next-api-decorators'

NextAuthGuard('api')
class ApiQueueTelegramHandler {
	constructor(private readonly telegramBot = TelegramService.init()) {}

	@Post()
	public async workerProcessor(@Body() job: Job<any, any, string>) {
		if (job.name == 'new-project-reports') {
			await this.newProjectReports()
		}

		if (job.name == 'new-specialities') {
			await this.newSpecialities()
		}

		if (job.name == 'new-vacancies') {
			await this.newVacancies()
		}

		return { success: true }
	}

	@QueueBrokerLog('new-project-reports')
	async newProjectReports() {
		return await this.telegramBot.sendNewProjectReports({ inLastDays: 1, locale: AvailableLocales.ru })
	}

	@QueueBrokerLog('new-specialities')
	async newSpecialities() {
		return await this.telegramBot.sendNewSpecialities({ inLastDays: 1, locale: AvailableLocales.ru })
	}

	@QueueBrokerLog('new-vacancies')
	async newVacancies() {
		return await this.telegramBot.sendNewVacancies({ inLastDays: 1, locale: AvailableLocales.ru })
	}
}

export default createHandler(ApiQueueTelegramHandler)
