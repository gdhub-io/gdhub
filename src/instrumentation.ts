export const register = async () => {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { tgMessageWorkerRun } = await import('./workers/tg-message.worker')
		const { matchingSpecAndProjWorkerRun } = await import('./workers/matching.worker')
		const { redisConnectionIsReady } = await import('./services/redis')

		const isReady = await redisConnectionIsReady()

		if (isReady) {
			tgMessageWorkerRun()
			matchingSpecAndProjWorkerRun()
		}
	}
}
