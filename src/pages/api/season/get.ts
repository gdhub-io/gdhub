import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import AirtableService from '@/services/airtable'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { slug } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !slug) throw new Error('Forbidden request')

		const [season] = await AirtableService('Seasons')
			.select({
				filterByFormula: `Slug = "${slug}"`,
				maxRecords: 1,
			})
			.all()

		if (!season) {
			throw new Error('Not found the season data')
		}

		const stagesList = season.get('Season Stages') as string[]
		const stages = await AirtableService('Season Stages')
			.select({
				sort: [{ field: 'Order', direction: 'asc' }],
				fields: ['Name', 'Started At', 'Finished At', 'Status'],
				filterByFormula: `FIND(RECORD_ID(), "${stagesList.join(' ')}")`,
			})
			.all()
		const currentStage = stages?.find((s: any) => s.get('Status') === 'Active')

		res.json({
			id: season.id,
			Stage: currentStage?.get('Name'),
			...season.fields,
			'Season Stages': stages.map((s: any) => ({ id: s.id, ...s.fields })),
		})
	} catch (error: any) {
		console.log('[API]', error)
		res.json({ success: false, error })
	}
}
