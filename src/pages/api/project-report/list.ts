import { NextApiRequest, NextApiResponse } from 'next'
import AirtableService from '@/services/airtable'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { projectId } = req.body

		if (req.method !== 'POST' || !projectId) throw new Error('Forbidden request')

		const reports = await AirtableService('Project Reports')
			.select({
				filterByFormula: `{Project ID} = "${projectId}"`,
				sort: [{ field: 'Date', direction: 'desc' }],
			})
			.all()

		res.json({
			total: reports ? reports.length : 0,
			data: reports.map((candidate: any) => ({
				id: candidate.id,
				...candidate.fields,
			})),
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
