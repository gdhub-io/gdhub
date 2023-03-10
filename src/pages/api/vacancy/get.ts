import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id }: any = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !id) throw new Error('Forbidden request')

		const vacancy = await AirtableService('Project Vacancies').find(id)
		const project = await AirtableService('Project Ideas').find(vacancy.get('Project') as string)

		let memberApply: any = []

		if (session) {
			memberApply = await AirtableService('Project Members')
				.select({
					fields: [],
					maxRecords: 1,
					filterByFormula: `AND(Status = "Intent", FIND("${session.user.email}", Member), FIND("${id}", {Vacancy ID}))`,
				})
				.all()
		}

		res.json({
			id: vacancy.id,
			memberApply: memberApply.length > 0 ? memberApply[0].id : false,
			...vacancy.fields,
			project: { id: project.id, name: project.get('Name'), seasonName: project.get('Season Name') },
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
