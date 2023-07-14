import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UpdateProfileDto } from '@/types/dto/profile'
import { Body, Get, Put, Req, ValidationPipe, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiProfileHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser) {
		const profile = await prisma.profile.findFirst({
			where: { userId: req.user.id },
			include: { preferredGenres: true, preferredLevels: true, preferredSettings: true },
		})

		return profile
	}

	@Put()
	public async update(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) body: UpdateProfileDto) {
		const { data } = body
		const { preferredGenres, preferredLevels, preferredSettings, ...othersData } = data

		if (data.tgNickname) {
			let telegramUsername = data.tgNickname as string
			telegramUsername = telegramUsername.replace(/@/g, '').replace(/https:\/\/t\.me\//g, '')
			data.tgNickname = telegramUsername
		}

		await prisma.profile.update({
			where: { userId: req.user.id },
			data: {
				...othersData,
				preferredGenres: {
					set: preferredGenres?.map((v: string) => ({ id: v })),
				},
				preferredLevels: { set: preferredLevels?.map((v: string) => ({ id: v })) },
				preferredSettings: { set: preferredSettings?.map((v: string) => ({ id: v })) },
			},
		})
	}
}

export default createHandler(ApiProfileHandler)
