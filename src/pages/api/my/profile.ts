import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const [profile] = await AirtableService('Profiles')
			.select({
				filterByFormula: `FIND("${session.user.email}", Account)`,
			})
			.all()

		if (!profile) {
			throw new Error('No found the user')
		}

		const timeForWork = profile.get('Time For Work') as string

		res.json({ id: profile.getId(), ...profile.fields, 'Time For Work': timeForWork ? timeForWork.split('-') : null })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
