import { getBlocks, getGamelabStageBlocks } from '@/services/notion'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { pageSlug, lang = process.env.NEXT_PUBLIC_APP_DEFAULT_LOCALE as string, table = 'docs' } = req.body
	const session = await getServerSession(req, res, authOptions)
	let response: any = undefined

	try {
		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		if (table == 'docs') {
			response = await getBlocks(pageSlug, lang)
		}

		if (table == 'gamelab-pipeline') {
			response = await getGamelabStageBlocks(pageSlug, lang)
		}

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
