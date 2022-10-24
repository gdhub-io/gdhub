import AirtableService from '@services/airtable'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'

type PaymentState = {
	[key: string]: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { id, profileId, data } = req.body
	const session: any = await unstable_getServerSession(req, res, authOptions)
	let speciality

	try {
		if (req.method !== 'POST' || !session || !profileId) throw new Error('Forbidden request')

		if (!id) {
			const profile = await AirtableService('Profiles').find(profileId)
			const specialities = profile.get('Specialities') as any[]

			speciality = await AirtableService('Specialities').create({
				...data,
				Profile: [profileId],
				Tools: data.Tools ? data.Tools.join(`\n`) : '',
			})

			if (!specialities) {
				const account = await AirtableService('Accounts').find(session.user.id)
				const roles = account.get('Roles') as string[]

				await AirtableService('Accounts').update(account.id, {
					Roles: [...roles, 'Member'],
				})
			}
		} else {
			speciality = await AirtableService('Specialities').update(id, {
				...data,
				Tools: data.Tools ? data.Tools.join(`\n`) : '',
			})
		}

		if (!speciality) {
			throw new Error('Error')
		}

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
