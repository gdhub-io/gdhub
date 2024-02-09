import { env } from './helpers/env'

export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { TgMessageQueueWorkerRunning, tgMessageQueue } = await import('@/workers/tg-message.worker')

		/** Run Telegram Message Worker */
		TgMessageQueueWorkerRunning()

		await tgMessageQueue.add('new-project-reports', null, {
			repeat: { pattern: env('QUEUE_PROJECT_REPORTS_CRON'), utc: true },
		})
		await tgMessageQueue.add('new-specialities', null, {
			repeat: { pattern: env('QUEUE_VACANCIES_CRON'), utc: true },
		})
		await tgMessageQueue.add('new-vacancies', null, {
			repeat: { pattern: env('QUEUE_SPECIALITIES_CRON'), utc: true },
		})

		console.log('Run Telegram Message Worker')
	}
}
