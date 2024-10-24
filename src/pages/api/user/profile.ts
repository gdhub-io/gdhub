import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UpdateProfileDto } from '@/types/dto/profile'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
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
			primaryInterest,
			lang,
			...othersProfileData
		} = body

		let profile = await prisma.profile.findUnique({ where: { userId: req.user.id! }, include: { user: true } })
		let updatedRoles = (profile?.user.roles as prismaClient.UserRole[]) || []

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

		// on  onboarding
		if (onboardingDone) {
			updatedRoles = [prismaClient.UserRole.Member]
		}
		// on  save profile
		if (primaryInterest && primaryInterest == prismaClient.PrimaryInterest.Specialist) {
			const idxMentor = updatedRoles.findIndex((v) => v === prismaClient.UserRole.Mentor)
			const idxAuthor = updatedRoles.findIndex((v) => v === prismaClient.UserRole.Author)

			if (idxMentor !== -1) {
				updatedRoles.splice(idxMentor, 1)
			}
			if (idxAuthor !== -1) {
				updatedRoles.splice(idxAuthor, 1)
			}
		}
		if (
			primaryInterest &&
			primaryInterest == prismaClient.PrimaryInterest.Author &&
			!updatedRoles.includes(prismaClient.UserRole.Author)
		) {
			const idx = updatedRoles.findIndex((v) => v === prismaClient.UserRole.Mentor)

			if (idx !== -1) {
				updatedRoles.splice(idx, 1)
			}
			updatedRoles.push(prismaClient.UserRole.Author)
		}
		if (
			primaryInterest &&
			primaryInterest == prismaClient.PrimaryInterest.Mentor &&
			!updatedRoles.includes(prismaClient.UserRole.Mentor)
		) {
			const idx = updatedRoles.findIndex((v) => v === prismaClient.UserRole.Author)

			if (idx !== -1) {
				updatedRoles.splice(idx, 1)
			}

			updatedRoles.push(prismaClient.UserRole.Mentor)
		}

		await prisma.profile.update({
			where: { userId: req.user.id },
			data: {
				...othersProfileData,
				name,
				primaryInterest,
				preferredGenres: preferredGenres
					? {
							set: preferredGenres?.map((v: string) => ({ id: v })),
						}
					: undefined,
				preferredLevels: preferredLevels ? { set: preferredLevels?.map((v: string) => ({ id: v })) } : undefined,
				preferredSettings: preferredSettings ? { set: preferredSettings?.map((v: string) => ({ id: v })) } : undefined,
				user: {
					update: {
						lang,
						onboardingDone,
						roles: updatedRoles,
						// roles: profile.user.roles.includes(prismaClient.UserRole.Admin) ? updatedRoles : undefined,
						agreements: agreementsChanged ? agreements : undefined,
					},
				},
			},
		})
	}
}

export default createHandler(ApiProfileHandler)
