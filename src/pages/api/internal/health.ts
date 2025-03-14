import { prisma } from '@/services/prisma'
import TelegramService from '@/services/telegram'
import { SearchEngineService } from '@/services/typesense'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createHandler, Get } from 'next-api-decorators'

class ApiHealthyHandler {
	constructor(private readonly telegramService = TelegramService.init()) {}

	@Get()
	async handler(req: NextApiRequest, res: NextApiResponse) {
		// check if database is healthy
		const dbResult = await prisma.$isHealthy()

		// check if http request is healthy
		const httpResult = await fetch(process.env.NEXTAUTH_URL || '')

		// check if novu is healthy
		const tolgeeResult = await fetch(process.env.NEXT_PUBLIC_TOLGEE_API_URL || '')

		const typesenseService = await SearchEngineService.init()
		const typesenseResult = await typesenseService.client.health.retrieve()

		const telegramResult = await this.telegramService.health()

		const total = dbResult && httpResult.ok && tolgeeResult.ok && typesenseResult.ok

		return {
			healthy: total,
			services: {
				'server[http]': httpResult.ok,
				'db[postgres]': dbResult,
				'translate[tolgee]': tolgeeResult.ok,
				'search[typesense]': typesenseResult.ok,
				'chat[telegram]': telegramResult.ok,
				'images[sanity]': '',
				'queue[redis]': '',
				'notifications[novu]': '',
				'ai[openai]': '',
				'email[brevo]': '',
			},
		}
	}
}

export default createHandler(ApiHealthyHandler)
