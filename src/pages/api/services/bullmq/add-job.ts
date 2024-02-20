import { tgMessageQueueInit } from '@/workers/tg-message.worker'
import { Get, createHandler } from 'next-api-decorators'

// @NextAuthGuard('api')
class ApiAddJobHandler {
	constructor() {}

	@Get()
	public async addJob() {
		const data = {
			message: 'This is a sample job',
		}

		const tgMessageQueue = tgMessageQueueInit()

		await tgMessageQueue.add('someJob', data)

		return { status: 'Message added to the queue' }
	}
}

export default createHandler(ApiAddJobHandler)
