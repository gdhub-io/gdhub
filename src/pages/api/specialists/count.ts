import AirtableService from '@/services/airtable'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const specialities = await AirtableService('Specialities').select({ fields: [] }).all()

		res.json({ count: specialities?.length || 0 })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
