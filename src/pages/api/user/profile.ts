import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UpdateProfileDto } from '@/types/dto/profile'
import { Prisma, UserRole } from '@prisma/client'
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
	public async createOrUpdate(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) body: UpdateProfileDto) {
		const {
			name,
			onboardingDone,
			confirmUserData,
			preferredGenres,
			preferredLevels,
			preferredSettings,
			...othersData
		} = body

		let profile = await prisma.profile.findUnique({ where: { userId: req.user.id! } })

		if (!profile) {
			profile = await prisma.profile.create({ data: { name: name!, userId: req.user.id! } })
		}

		if (body.tgNickname) {
			let telegramUsername = body.tgNickname as string
			telegramUsername = telegramUsername.replace(/@/g, '').replace(/https:\/\/t\.me\//g, '')
			body.tgNickname = telegramUsername
		}

		const previousAgreements = profile.agreements as Record<string, any>

		await prisma.profile.update({
			where: { userId: req.user.id },
			data: {
				...othersData,
				name,
				preferredGenres: preferredGenres
					? {
							set: preferredGenres?.map((v: string) => ({ id: v })),
					  }
					: undefined,
				preferredLevels: preferredLevels ? { set: preferredLevels?.map((v: string) => ({ id: v })) } : undefined,
				preferredSettings: preferredSettings ? { set: preferredSettings?.map((v: string) => ({ id: v })) } : undefined,
				agreements: confirmUserData ? ({ ...previousAgreements, confirmUserData } as Prisma.JsonObject) : undefined,
				user: onboardingDone ? { update: { onboardingDone, roles: { set: [UserRole.Member] } } } : undefined,
			},
		})
	}
}

export default createHandler(ApiProfileHandler)
