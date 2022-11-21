import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const session: any = await unstable_getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const lectures = await AirtableService('Lectures')
			.select({
				filterByFormula: `{Archived} = FALSE()`,
			})
			.all()

		const queryResult = await AirtableService('Lectures').select({ fields: [] }).all()

		res.json({
			total: queryResult.length,
			data: lectures.map((lecture: any) => ({
				id: lecture.id,
				...lecture.fields,
			})),
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
