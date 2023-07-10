import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { PrismaService } from '@/services/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const session = await getServerSession(req, res, authOptions)
	const prismaService = PrismaService.getInstance()

	try {
		if (req.method !== 'GET' || !session) throw new Error('Forbidden request')

		const profile = await prismaService.client.profile.findFirst({
			where: { userId: session?.user.id },
			include: { preferredGenres: true, preferredLevels: true, preferredSettings: true },
		})

		res.json(profile)
	} catch (error: any) {
		res.json({ success: false, error })
	}
}
