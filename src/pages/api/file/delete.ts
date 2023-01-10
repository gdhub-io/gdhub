import SanityService from '@services/sanity'
import type { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
	try {
		const session: any = await unstable_getServerSession(req, res, authOptions)
		const { fileUrl } = req.body

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const response = await SanityService.removeFile(fileUrl)

		res.status(200).json(response)
	} catch (error: any) {
		console.log('[API ERROR]', error)

		res.status(200).json({ success: false, error: error?.message })
	}
}

export default handler
