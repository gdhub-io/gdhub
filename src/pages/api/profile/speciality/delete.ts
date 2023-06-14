import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import AirtableService from '@/services/airtable'
import { SearchEngineService } from '@/services/typesense'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { specialityId } = req.body
		const session: any = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !specialityId) throw new Error('Forbidden request')

		await AirtableService('Specialities').destroy(specialityId)

		const searchClient = await SearchEngineService.init()
		await searchClient.deleteSpecialist(specialityId)

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
