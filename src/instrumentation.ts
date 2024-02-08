export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const tgMessageWorkerLib = await import('@/workers/tg-message.worker')

		/** Run Telegram Message Worker */
		console.log('Run Telegram Message Worker')
		tgMessageWorkerLib.TgMessageQueueWorkerRunning()
	}
}
