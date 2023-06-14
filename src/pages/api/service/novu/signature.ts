import { createHmac } from 'crypto'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const session = await getServerSession(req, res, authOptions)

		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const signature = createHmac('sha256', process.env.NOVU_API_SECRET as string)
			.update(session.user.id)
			.digest('hex')

		res.json({ signature })
	} catch (error: any) {
		res.json({ error: error.message })
	}
}
