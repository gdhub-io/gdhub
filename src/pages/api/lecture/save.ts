import AirtableService from '@services/airtable'
import TelegramService from '@services/telegram'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { id, data }: any = req.body

	try {
		const session: any = await unstable_getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		if (!id) {
			const lecture: any = await AirtableService('Lectures').create({
				...data,
				Lecturer: data.Lecturer ? [data.Lecturer] : null,
				Status: data.Lecturer ? 'Proposed' : 'Requested',
				'Requested By': [session.user.id],
				Cost: 0,
			})

			await AirtableService('Lecture Listeners').create({
				'Listener Account': [session.user.id],
				Lecture: [lecture.id],
				Status: 'Intent',
			})

			// send to telegram
			await TelegramService.sendMessage(`test\ntest2`)

			res.json({
				success: true,
				lecture: {
					...lecture.fields,
					id: lecture.id,
					isRelevant: true,
				},
			})
		} else {
			const lectureData = {
				...data,
				Lecturer: data.Lecturer ? [data.Lecturer] : null,
			}

			if (data.Lecturer && data.Date && data.Link) {
				lectureData.Status = 'Ready'
			}

			const lecture = await AirtableService('Lectures').update(id, lectureData)

			res.json({
				success: true,
				lecture: lecture,
			})
		}
	} catch (error: any) {
		console.log('error', id, error)
		res.json({ success: false, error: error.message })
	}
}
