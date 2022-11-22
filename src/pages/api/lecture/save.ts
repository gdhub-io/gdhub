import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { lectureId, data }: any = req.body
		const session: any = await unstable_getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		if (!lectureId) {
			const lecture: any = await AirtableService('Lectures').create({
				...data,
				Status: 'Requested',
				'Requested By': [session.user.id],
			})

			await AirtableService('Lecture Listeners').create({
				'Listener Account': [session.user.id],
				Lecture: [lecture.id],
				Status: 'Intent',
			})

			res.json({
				success: true,
				lecture: {
					...lecture.fields,
					id: lecture.id,
					isRelevant: true,
				},
			})
		} else {
			const lecture = await AirtableService('Lectures').update(lectureId, {
				...data,
			})

			res.json({
				success: true,
				lecture: lecture,
			})
		}
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
