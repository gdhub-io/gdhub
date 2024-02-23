export const register = async () => {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { tgMessageQueue, tgMessageWorkerRun } = await import('./workers/tg-message.worker')
		const { matchingSpecAndProjWorkerRun } = await import('./workers/matching.worker')
		const { redisConnectionIsReady } = await import('./services/redis')
		const { CronExpressionBuilder } = await import('natural-cron')

		const isReady = await redisConnectionIsReady()
		const schedule = new CronExpressionBuilder()

		if (isReady) {
			tgMessageWorkerRun()
			matchingSpecAndProjWorkerRun()

			/** Init cron jobs */
			await tgMessageQueue.remove('new-project-reports')
			await tgMessageQueue.add('new-project-reports', null, {
				jobId: 'new-project-reports',
				repeat: { pattern: schedule.atTime(process.env.QUEUE_PROJECT_REPORTS_TIME || '00:00').compile(), utc: true },
			})

			await tgMessageQueue.remove('new-specialities')
			await tgMessageQueue.add('new-specialities', null, {
				jobId: 'new-specialities',
				repeat: { pattern: schedule.atTime(process.env.QUEUE_SPECIALITIES_TIME || '06:00').compile(), utc: true },
			})

			await tgMessageQueue.remove('new-vacancies')
			await tgMessageQueue.add('new-vacancies', null, {
				jobId: 'new-vacancies',
				repeat: { pattern: schedule.atTime(process.env.QUEUE_VACANCIES_TIME || '12:00').compile(), utc: true },
			})
		}
	}
}
