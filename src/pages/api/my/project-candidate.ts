import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !id) throw new Error('Forbidden request')

		const [projectMember] = await AirtableService('Project Members')
			.select({
				maxRecords: 1,
				filterByFormula: `AND(RECORD_ID() = "${id}", Status = "Intent")`,
			})
			.all()

		if (!projectMember) {
			throw new Error('Error')
		}

		const [specialityId] = projectMember.get('Speciality') as string[]
		const speciality = await AirtableService('Specialities').find(specialityId)

		const [profileId] = speciality.get('Profile') as string[]
		const profile = await AirtableService('Profiles').find(profileId)

		const allowedContacts = projectMember.get('Allowed Contacts') as string[]
		const [email] = profile.get('Email (from Account)') as string[]
		const contacts = {
			email: allowedContacts.includes('email') ? email : undefined,
			telegram: allowedContacts.includes('telegram') ? profile.get('Telegram Nickname') : undefined,
		}

		res.json({
			...projectMember.fields,
			contacts,
			Speciality: speciality.fields,
			Profile: profile.fields,
			id: projectMember.id,
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
