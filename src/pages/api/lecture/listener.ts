import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { lectureId, isRelevant }: any = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !lectureId) throw new Error('Forbidden request')

		const [lectureListener] = await AirtableService('Lecture Listeners')
			.select({
				maxRecords: 1,
				filterByFormula: `AND(Lecture = "${lectureId}", {Listener Account} = "${session.user.email}")`,
			})
			.all()

		if (lectureListener) {
			if (!isRelevant) {
				await AirtableService('Lecture Listeners').destroy(lectureListener.id)

				return res.json({ success: true })
			}
		} else {
			await AirtableService('Lecture Listeners').create({
				'Listener Account': [session.user.id],
				Lecture: [lectureId],
				Status: 'Intent',
			})
		}

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
