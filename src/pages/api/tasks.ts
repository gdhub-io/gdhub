import { backendVerify } from '@helpers/access'
import { drop } from '@services/typesense/commands/drop'
import { migrate } from '@services/typesense/commands/migrate'
import { search } from '@services/typesense/commands/search'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { query } = req.body
		if (req.method !== 'POST' || !backendVerify(req)) return res.status(404).end()

		switch (req.body.task) {
			case 'searchengine-migrate':
				await migrate()
				break
			case 'searchengine-drop':
				await drop()
				break
			case 'searchengine-search':
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
