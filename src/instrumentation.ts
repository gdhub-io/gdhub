import { env } from './helpers/env'

export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { TgMessageQueueWorkerRunning, tgMessageQueue } = await import('@/workers/tg-message.worker')

		/** Run Telegram Message Worker */
		const { ready } = TgMessageQueueWorkerRunning()

		if (!ready) {
			console.log('Redis connection is not ready.')
			return
		}

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
