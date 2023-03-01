import AirtableService from '@services/airtable'
// import TelegramService from '@services/telegram'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'

type PaymentState = {
	[key: string]: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { id, profileId, data } = req.body
	const session: any = await getServerSession(req, res, authOptions)
	let speciality: any

	try {
		if (req.method !== 'POST' || !session || !profileId) throw new Error('Forbidden request')

		if (!id) {
			const account = await AirtableService('Accounts').find(session.user.id)
			const profile = await AirtableService('Profiles').find(profileId)
			const specialities = profile.get('Specialities') as any[]

			speciality = await AirtableService('Specialities').create({
				...data,
				Profile: [profileId],
				Tools: data.Tools ? data.Tools.join(`\n`) : '',
			})

			if (!specialities) {
				const roles = account.get('Roles') as string[]

				await AirtableService('Accounts').update(account.id, {
					Roles: [...roles, 'Member'],
				})
			}

			/** Send message to Telegram */
			// 			await TelegramService.sendPhoto(
			// 				(account.get('Image Link') as string) || 'https://cdn-icons-png.flaticon.com/512/219/219988.png',
			// 				`
			// К геймхабу присоеденился <b>${profile.get('Name')}</b>
			// Специальность: ${speciality.get('Name')} (${speciality.get('Level')})
			// Навыки:\n${speciality.get('Skills')}

			// Портфолио/резюме:\n${profile.get('Resume/Portfolio')}
			// 				`
			// 			)
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
