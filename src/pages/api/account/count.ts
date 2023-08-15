import { NextApiRequest, NextApiResponse } from 'next'
import AirtableService from '@/services/airtable'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const users = await AirtableService('Accounts').select({ fields: [] }).all()

		res.json({ count: users?.length || 0 })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
