import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

type BodyData = {
	roomName: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const session: any = await getServerSession(req, res, authOptions)
	const { roomName }: BodyData = req.body

	try {
		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const dailyRes = await fetch('https://api.daily.co/v1/meeting-tokens', {
			method: 'post',
			body: JSON.stringify({
				properties: {
					room_name: session.user.hasRole('admin') ? undefined : roomName,
					is_owner: session.user.hasRole('admin'),
					user_name: session.user.name,
					enable_screenshare: true,
				},
			}),
			headers: {
				Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
			},
		})

		const { token, error } = await dailyRes.json()

		if (error) {
			return res.status(500).json({ error })
		}

		res.json({ token })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
