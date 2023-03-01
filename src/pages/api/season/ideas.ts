import AirtableService from '@services/airtable'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { seasonName, status = 'Approved' } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !seasonName) throw new Error('Forbidden request')

		const projectIdeas = await AirtableService('Project Ideas')
			.select({
				filterByFormula: `AND(FIND("${seasonName}", Season), Status = "${status}")`,
			})
			.all()

		if (!projectIdeas || projectIdeas.length === 0) {
			throw new Error('Not found any projects ideas')
		}

		res.json(projectIdeas.map((r) => ({ ...r.fields })))
	} catch (error: any) {
		console.log('[API]', error)
		res.json({ success: false, error })
	}
}
