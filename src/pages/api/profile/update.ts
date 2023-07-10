import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { PrismaService } from '@/services/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	let { id, data } = req.body
	const session = await getServerSession(req, res, authOptions)
	const prismaService = PrismaService.getInstance()

	try {
		if (req.method !== 'POST' || !session || !data) throw new Error('Forbidden request')

		if (data.tgNickname) {
			let telegramUsername = data.tgNickname as string
			telegramUsername = telegramUsername.replace(/@/g, '').replace(/https:\/\/t\.me\//g, '')
			data.tgNickname = telegramUsername
		}

		const { preferredGenres, preferredLevels, preferredSettings, ...othersData } = data

		const updatedProfile = await prismaService.client.profile.update({
			where: { userId: session.user.id },
			data: {
				preferredGenres: {
					set: preferredGenres?.map((v: string) => ({ id: v })),
				},
				preferredLevels: { set: preferredLevels?.map((v: string) => ({ id: v })) },
				preferredSettings: { set: preferredSettings?.map((v: string) => ({ id: v })) },
			},
		})

		if (!updatedProfile) {
			throw new Error('Error')
		}

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
