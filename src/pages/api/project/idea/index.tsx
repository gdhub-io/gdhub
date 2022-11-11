import AirtableService from '@services/airtable'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id } = req.body
		const session: any = await unstable_getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session || !id) throw new Error('Forbidden request')

		const projectIdea = await AirtableService('Project Ideas').find(id)

		if (!projectIdea) {
			throw new Error('Error')
		}

		res.json({
			id: projectIdea.id,
			...projectIdea.fields,
		})
	} catch (error: any) {
		console.log('[API]', error)
		res.json({ success: false, error })
	}
}
