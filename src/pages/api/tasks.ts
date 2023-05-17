import { backendVerify } from '@helpers/access'
import { drop } from '@services/typesense/commands/drop'
import { migrate } from '@services/typesense/commands/migrate'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		if (req.method !== 'POST' || !backendVerify(req)) return res.status(404).end()

		switch (req.query.task) {
			case 'searchengine-migrate':
				await migrate()
				break
			case 'searchengine-drop':
				await drop()
				break
		}

		return res.json({ ok: true })
	} catch (error: any) {
		return res.json({ ok: false, error: error.message })
	}
}
