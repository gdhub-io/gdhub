import { NextApiRequest, NextApiResponse } from 'next'
import { unstable_getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

type BodyData = {
	roomName: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const session: any = await unstable_getServerSession(req, res, authOptions)
	const { roomName }: BodyData = req.body

	try {
		if (req.method !== 'POST' || !session) throw new Error('Forbidden request')

		const response = await fetch('https://api.daily.co/v1/meeting-tokens', {
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

		const data = await response.json()

		res.json({ token: data.token })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
