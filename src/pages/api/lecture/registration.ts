import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id }: any = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !id) throw new Error('Forbidden request')

		const [lectureListener] = await AirtableService('Lecture Listeners')
			.select({
				maxRecords: 1,
				filterByFormula: `AND(Lecture = "${id}", {Listener Account} = "${session.user.email}")`,
			})
			.all()

		if (lectureListener) {
			if (lectureListener.get('Status') == 'Registered') {
				res.json({ success: true, newRegistration: false })
			}

			await AirtableService('Lecture Listeners').update(lectureListener.id, {
				Status: 'Registered',
			})
		} else {
			await AirtableService('Lecture Listeners').create({
				'Listener Account': [session.user.id],
				Lecture: [id],
				Status: 'Registered',
			})
		}

		res.json({ success: true, newRegistration: true })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
