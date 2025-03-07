import { prisma } from '@/services/prisma'
import { SearchEngineService } from '@/services/typesense'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method === 'GET') {
		// check if database is healthy
		const dbResult = await prisma.$isHealthy()

		// check if http request is healthy
		const httpResult = await fetch(process.env.NEXTAUTH_URL || '')

		// check if novu is healthy
		const tolgeeResult = await fetch(process.env.NEXT_PUBLIC_TOLGEE_API_URL || '')

		const typesenseService = await SearchEngineService.init()
		const typesenseResult = await typesenseService.client.health.retrieve()

		const total = dbResult && httpResult.ok && tolgeeResult.ok && typesenseResult.ok

		return res.json({
			healthy: total,
			services: {
				'server[http]': httpResult.ok,
				'db[postgres]': dbResult,
				'translate[tolgee]': tolgeeResult.ok,
				'search[typesense]': typesenseResult.ok,
				'chat[telegram]': '',
				'images[sanity]': '',
				'queue[redis]': '',
				'notifications[novu]': '',
				'ai[openai]': '',
				'email[brevo]': '',
			},
		})
	}
}
