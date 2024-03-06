import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UpdateProfileDto } from '@/types/dto/profile'
import { UserRole } from '@prisma/client'
import { Body, Get, Put, Req, ValidationPipe, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiProfileHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser) {
		const profile = await prisma.profile.findFirst({
			where: { userId: req.user.id },
			include: {
				preferredGenres: true,
				preferredLevels: true,
				preferredSettings: true,
				user: { select: { agreements: true } },
			},
		})

		return profile
	}

	@Put()
	public async createOrUpdate(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) body: UpdateProfileDto) {
		const {
			name,
			onboardingDone,
			confirmUserData,
			agreeWithTermsAndPrivacy,
			needSubscribeToNewsletter,
			preferredGenres,
			preferredLevels,
			preferredSettings,
			...othersData
		} = body

		let profile = await prisma.profile.findUnique({ where: { userId: req.user.id! }, include: { user: true } })

		if (!profile) {
			profile = await prisma.profile.create({ data: { name: name!, userId: req.user.id! }, include: { user: true } })
		}

		if (body.tgNickname) {
			let telegramUsername = body.tgNickname as string
			telegramUsername = telegramUsername.replace(/@/g, '').replace(/https:\/\/t\.me\//g, '')
			body.tgNickname = telegramUsername
		}

		const agreementsChanged = confirmUserData || agreeWithTermsAndPrivacy || needSubscribeToNewsletter
		const agreements = profile.user.agreements as Record<string, any>
		if (confirmUserData) agreements.confirmUserData = confirmUserData
		if (agreeWithTermsAndPrivacy) agreements.agreeWithTermsAndPrivacy = agreeWithTermsAndPrivacy
		if (needSubscribeToNewsletter) agreements.needSubscribeToNewsletter = needSubscribeToNewsletter

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
				user: {
					update: {
						onboardingDone,
						roles: onboardingDone ? { set: [UserRole.Member] } : undefined,
						agreements: agreementsChanged ? agreements : undefined,
					},
				},
			},
		})
	}
}

export default createHandler(ApiProfileHandler)
