import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const users = await AirtableService('Accounts').select({ fields: [] }).all()

		res.json({ count: users?.length || 0 })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
