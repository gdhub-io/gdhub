import { backendVerify } from '@/helpers/access'
import { SearchEngineService } from '@/services/typesense'
import { drop } from '@/services/typesense/commands/drop'
import { migrate } from '@/services/typesense/commands/migrate'
import { search } from '@/services/typesense/commands/search'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { query } = req.body
		const searchClient = await SearchEngineService.init()
		if (req.method !== 'POST' || !backendVerify(req)) return res.status(404).end()

		switch (req.body.task) {
			case 'health':
				const health = await searchClient.client.health.retrieve()
				return res.json(health)
			case 'migrate':
				await migrate()
				break
			case 'specialists':
				const docs = await searchClient.client.collections('specialists').documents().export()
				return res.json(docs)
			case 'drop':
				await drop()
				break
			case 'search':
				const result = await search({
					q: query,
					query_by: 'Name,Direction,Schools',
				})
				return res.json(result)
			default:
				throw Error('Unknown task')
		}

		return res.json({ ok: true })
	} catch (error: any) {
		return res.status(405).json({ error: error.message })
	}
}
