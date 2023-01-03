import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id }: any = req.body
		const session: any = await unstable_getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !id) throw new Error('Forbidden request')

		const vacancy = await AirtableService('Project Vacancies').find(id)

		const memberApply = await AirtableService('Project Members')
			.select({
				fields: [],
				maxRecords: 1,
				filterByFormula: `AND(Status = "Intent", FIND("${session.user.email}", Member), FIND("${id}", {Vacancy ID}))`,
			})
			.all()

		res.json({ id: vacancy.id, memberApply: memberApply.length > 0 ? memberApply[0].id : false, ...vacancy.fields })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
