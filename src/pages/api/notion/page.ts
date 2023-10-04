import { getBlocks } from '@/services/notion'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { pageSlug } = req.body
	const session = await getServerSession(req, res, authOptions)

	try {
		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		let response: any = await getBlocks(pageSlug)

		if (!response) {
			throw new Error('Error')
		}

		response = response.map((block: any) => {
			if (block.type == 'video') {
				console.log(block.video.external)
			}

			return block
		})

		res.json(response)
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
