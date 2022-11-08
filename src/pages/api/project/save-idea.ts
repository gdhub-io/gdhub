import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

type PaymentState = {
	[key: string]: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id, data } = req.body
		const session: any = await unstable_getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		if (id) {
			const response = await AirtableService('Project Ideas').update(id, data)
			if (!response) {
				throw new Error('Error')
			}
		} else {
			await AirtableService('Project Ideas').create({
				...data,
				Author: [session.user.id],
				Status: 'Added',
				Season: [data.Season],
				'Core Mechanics': data['Core Mechanics'].join('|'),
			})
		}

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
