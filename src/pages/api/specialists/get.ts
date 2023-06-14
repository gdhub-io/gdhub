import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !id) throw new Error('Forbidden request')

		const speciality = await AirtableService('Specialities').find(id)

		if (!speciality) {
			throw new Error('Error')
		}

		const [profileId] = speciality.get('Profile') as string[]
		const [profile] = await AirtableService('Profiles')
			.select({
				fields: [
					'Country',
					'City',
					'Created',
					'Telegram Nickname',
					'Preferred Settings',
					'Preferred Genres',
					'Preferred Difficulty Levels',
					'Time For Work',
					'Email (from Account)',
					'Resume/Portfolio',
				],
				filterByFormula: `RECORD_ID() = "${profileId}"`,
			})
			.all()

		res.json({ ...speciality.fields, Profile: profile.fields, id: speciality.id })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
