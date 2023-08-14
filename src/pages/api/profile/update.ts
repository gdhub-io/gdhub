import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import AirtableService from '@/services/airtable'

type PaymentState = {
	[key: string]: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	let { id, data } = req.body
	const session = await getServerSession(req, res, authOptions)

	try {
		if (req.method !== 'POST' || !session || !data) throw new Error('Forbidden request')

		if (data.hasOwnProperty('Telegram Nickname')) {
			let telegramUsername = data['Telegram Nickname'] as string
			telegramUsername = telegramUsername.replace(/@/g, '').replace(/https:\/\/t\.me\//g, '')

			data['Telegram Nickname'] = telegramUsername
		}

		const response = await AirtableService('Profiles').update(id, data)

		if (!response) {
			throw new Error('Error')
		}

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
