import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import AirtableService from '@/services/airtable'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const user = await AirtableService('Accounts').find(session.user.id)

		if (!user) {
			throw new Error('No found the user')
		}

		const telegramNickname = user.get('Telegram Nickname')

		res.json({
			email: user.get('Email'),
			telegram: Array.isArray(telegramNickname) ? telegramNickname[0] : telegramNickname,
		})
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
