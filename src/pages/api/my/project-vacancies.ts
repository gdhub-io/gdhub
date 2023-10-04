import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { projectId, projectName } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !projectId) throw new Error('Forbidden request')

		const vacancies = await AirtableService('Project Vacancies')
			.select({
				filterByFormula: `AND(Status != "Closed", FIND("${projectName}", {Project}))`,
			})
			.all()

		res.json({
			total: vacancies ? vacancies.length : 0,
			data: vacancies.map((vacancy: any) => ({
				id: vacancy.id,
				...vacancy.fields,
			})),
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
