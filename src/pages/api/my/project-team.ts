import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { projectId, projectName } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !projectId) throw new Error('Forbidden request')

		const team = await AirtableService('Project Members')
			.select({
				filterByFormula: `AND(FIND("${projectName}", {Project}), OR(Status = "Member", Status = "Fired"))`,
			})
			.all()

		res.json({
			total: team ? team.length : 0,
			data: team.map((member: any) => ({
				id: member.id,
				...member.fields,
			})),
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
