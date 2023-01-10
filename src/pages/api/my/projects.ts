import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const session: any = await unstable_getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const projects = await AirtableService('Project Ideas')
			.select({
				filterByFormula: `AND(FIND("${session.user.email}", Author))`,
			})
			.all()

		const queryResult = await AirtableService('Project Ideas').select({ fields: [] }).all()

		if (!projects) {
			throw new Error('Error')
		}

		res.json({
			total: queryResult.length,
			data: projects.map((project: any) => ({
				id: project.id,
				...project.fields,
			})),
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
