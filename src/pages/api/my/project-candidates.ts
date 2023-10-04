import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { projectId, projectName } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !projectId) throw new Error('Forbidden request')

		const candidates = await AirtableService('Project Members')
			.select({
				filterByFormula: `AND(Status = "Intent", FIND("${projectName}", {Project}))`,
			})
			.all()

		res.json({
			total: candidates ? candidates.length : 0,
			data: candidates.map((candidate: any) => ({
				id: candidate.id,
				...candidate.fields,
			})),
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
