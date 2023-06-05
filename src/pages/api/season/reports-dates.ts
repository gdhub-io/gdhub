import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import AirtableService from '@/services/airtable'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { seasonName, stage } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !seasonName) throw new Error('Forbidden request')

		console.log(stage)

		const reportsDates = await AirtableService('Season Reports')
			.select({
				fields: ['Date'],
				filterByFormula: `AND(FIND("${seasonName}", Season), Stage = "${stage}")`,
				sort: [{ field: 'Date', direction: 'asc' }],
			})
			.all()

		if (!reportsDates || reportsDates.length === 0) {
			throw new Error('Not found any projects reports dates')
		}

		res.json(reportsDates.map((r) => ({ ...r.fields })))
	} catch (error: any) {
		console.log('[API]', error)
		res.json({ success: false, error })
	}
}
