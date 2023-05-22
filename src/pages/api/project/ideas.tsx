import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { seasonName } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const projectIdeas = await AirtableService('Project Ideas')
			.select({
				filterByFormula: `AND(FIND("${seasonName}", Season), FIND("${session.user.email}", Author))`,
				sort: [{ field: 'Last Modified', direction: 'desc' }],
			})
			.all()

		const queryResult = await AirtableService('Project Ideas')
			.select({
				fields: [],
				filterByFormula: `AND(FIND("${seasonName}", Season), FIND("${session.user.email}", Author))`,
			})
			.all()

		if (!projectIdeas) {
			throw new Error('Error')
		}

		res.json({
			total: queryResult.length,
			data: projectIdeas.map((projectIdea: any) => ({
				id: projectIdea.id,
				...projectIdea.fields,
			})),
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
