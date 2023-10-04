import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		if (req.method !== 'POST') throw new Error('Forbidden request')

		const vacancies = await AirtableService('Project Vacancies')
			.select({
				filterByFormula: `Status = "Opened"`,
				sort: [{ field: 'Published At', direction: 'desc' }],
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
