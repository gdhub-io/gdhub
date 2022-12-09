import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id }: any = req.body
		const session: any = await unstable_getServerSession(req, res, authOptions)
		let data: any = null

		if (req.method !== 'POST' || !session || !id) throw new Error('Forbidden request')

		const lecture = await AirtableService('Lectures').find(id)
		const lecturerIds = lecture.get('Lecturer') as string[]
		const registeredListeners = lecture.get('Registered Accounts') as string[]

		data = lecture.fields
		data.userRegistered = registeredListeners && registeredListeners.includes(session.user.id)

		if (lecturerIds) {
			const [lecturer]: any = await AirtableService('Profiles')
				.select({
					maxRecords: 1,
					filterByFormula: `{Account ID} = "${lecturerIds[0]}"`,
					fields: [
						'Specialities',
						'Name',
						'Resume/Portfolio',
						'Telegram',
						'Skills (from Specialities)',
						'Image Link (from Account)',
					],
				})
				.all()

			if (lecturer) {
				data.Lecturer = lecturer.fields
			}

			const specialityIds = lecturer.get('Specialities') as string[]

			if (specialityIds) {
				const specialities: any = await AirtableService('Specialities')
					.select({
						filterByFormula: `FIND(RECORD_ID(), "${specialityIds.join(' ')}")`,
						fields: ['Name', 'Level', 'Specialization'],
					})
					.all()

				if (specialities) {
					data.Lecturer.Specialities = specialities.map((s: any) => s.fields)
				}
			}
		}

		res.json(data)
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
