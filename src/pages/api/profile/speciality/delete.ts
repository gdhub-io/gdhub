import AirtableService from '@services/airtable'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { specialityId } = req.body
		const session: any = await unstable_getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !specialityId) throw new Error('Forbidden request')

		await AirtableService('Specialities').destroy(specialityId)

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
