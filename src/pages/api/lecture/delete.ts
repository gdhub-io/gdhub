import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import AirtableService from '@/services/airtable'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id }: any = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !id) throw new Error('Forbidden request')

		await AirtableService('Lectures').destroy(id)

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
