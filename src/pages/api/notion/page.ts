import { getBlocks } from '@services/notion'
import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { pageSlug } = req.body
	const session = await unstable_getServerSession(req, res, authOptions)

	try {
		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const response = await getBlocks(pageSlug)

		if (!response) {
			throw new Error('Error')
		}

		res.json(response)
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
