import AirtableService from '@services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

type PaymentState = {
	[key: string]: any
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { id, data } = req.body
	const session = await unstable_getServerSession(req, res, authOptions)

	try {
		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const response = await AirtableService('Profiles').update(id, data)

		if (!response) {
			throw new Error('Error')
		}

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
