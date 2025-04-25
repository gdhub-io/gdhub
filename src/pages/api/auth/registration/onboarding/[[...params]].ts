import { getServerLocale } from '@/helpers/format'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { brevoApi } from '@/services/brevo'
import { prisma } from '@/services/prisma'
import { UpdateProfileDto } from '@/types/dto/profile'
import { CreateSpecialityDto, UpdateSpecialityDto } from '@/types/dto/speciality'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { BadRequestException, Body, Get, Post, Put, Req, ValidationPipe, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiRegistrationHandler {
	@Get('/profile')
	public async getOnboardingProfile(@Req() req: NextApiRequestWithUser) {
		return await prisma.profile.findFirst({
			where: { user: { id: req.user.id } },
			include: { user: { select: { id: true, agreements: true } } },
		})
	}

	@Put('/profile')
	public async saveOnboardingProfile(@Req() req: NextApiRequestWithUser, @Body() body: Record<string, any>) {
		try {
			const locale = getServerLocale(req)
			const { name, yearOfBirth, country, city, confirmUserData, agreeWithTermsAndPrivacy, needSubscribeToNewsletter } =
				body

			const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { profile: true } })

			if (!user) throw new BadRequestException('The user is not exist')

			const agreements: any = user?.agreements || {}

			agreements.confirmUserData = confirmUserData
			if (agreeWithTermsAndPrivacy) agreements.agreeWithTermsAndPrivacy = agreeWithTermsAndPrivacy
			if (needSubscribeToNewsletter) agreements.needSubscribeToNewsletter = needSubscribeToNewsletter

			if (user?.profile) {
				await prisma.profile.update({
					where: { userId: req.user.id },
					data: {
						name,
						city,
						yearOfBirth,
						country,
						user: { update: { agreements, lang: locale } },
					},
				})
			} else {
				await prisma.profile.create({
					data: {
						name,
						city,
						yearOfBirth,
						country,
						user: { connect: { id: user.id } },
					},
				})
			}

			await prisma.user.update({ where: { id: user.id }, data: { agreements } })
		} catch (error) {
			console.error('saveOnboardingProfile: error', error)
		}
	}

	@Get('/speciality')
	public async getOnboardingSpeciality(@Req() req: NextApiRequestWithUser) {
		const speciality = await prisma.speciality.findFirst({
			where: { userId: req.user.id },
			include: { direction: true },
		})

		return speciality
	}

	@Post('/speciality')
	public async createFirstSpeciality(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) body: CreateSpecialityDto
	) {
		const { data } = body

		const speciality = await prisma.speciality.create({
			data: {
				...data,
				userId: req.user.id,
			} as any,
			include: { direction: true },
		})

		await prisma.user.update({
			where: { id: req?.user.id },
			data: { roles: { push: 'Member' } },
		})

		return speciality
	}

	@Put('/speciality')
	public async updateFirstSpeciality(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) body: UpdateSpecialityDto
	) {
		const {
			id,
			data: { workDirectionId, tools, ...otherData },
		} = body

		await prisma.speciality.update({
			where: { id, userId: req.user.id },
			data: {
				...otherData,
				direction: { connect: { id: workDirectionId } },
			} as any,
			include: { direction: true },
		})
	}

	@Get('/interest')
	public async getInterests(@Req() req: NextApiRequestWithUser) {
		return await prisma.profile.findFirst({
			where: { userId: req.user.id },
			select: {
				id: true,
				primaryInterest: true,
				preferredGenres: true,
				preferredLevels: true,
				preferredSettings: true,
			},
		})
	}

	@Put('/interest')
	public async updateInterests(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) body: UpdateProfileDto) {
		const { preferredGenres, preferredLevels, preferredSettings, primaryInterest } = body
		let role: prismaClient.UserRole = prismaClient.UserRole.Guest

		switch (primaryInterest) {
			case prismaClient.PrimaryInterest.Specialist: {
				role = prismaClient.UserRole.Member
				break
			}
			case prismaClient.PrimaryInterest.Author: {
				role = prismaClient.UserRole.Author
				break
			}
			case prismaClient.PrimaryInterest.Mentor: {
				role = prismaClient.UserRole.Mentor
				break
			}
		}

		await prisma.profile.update({
			where: { userId: req.user.id },
			data: {
				preferredGenres: preferredGenres
					? {
							set: preferredGenres?.map((v: string) => ({ id: v })),
						}
					: undefined,
				preferredLevels: preferredLevels ? { set: preferredLevels?.map((v: string) => ({ id: v })) } : undefined,
				preferredSettings: preferredSettings ? { set: preferredSettings?.map((v: string) => ({ id: v })) } : undefined,
				primaryInterest,
				user: {
					update: {
						roles: { set: [prismaClient.UserRole.Member, prismaClient.UserRole.Author] },
					},
				},
			} as any,
		})
	}

	@Get('/resources')
	public async getResources(@Req() req: NextApiRequestWithUser) {
		return await prisma.profile.findFirst({
			where: { userId: req.user.id },
			select: {
				id: true,
				timeForWork: true,
				otherResources: true,
				isActive: true,
			},
		})
	}

	@Put('/resources')
	public async updateResources(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) body: UpdateProfileDto) {
		const { timeForWork, otherResources, isActive } = body

		const profile = await prisma.profile.update({
			where: { userId: req.user.id },
			data: { timeForWork, otherResources, isActive, user: { update: { onboardingDone: true } } },
			select: {
				primaryInterest: true,
				name: true,
				user: { select: { agreements: true, name: true, email: true, lang: true } },
			},
		})

		try {
			const agreements = profile.user.agreements as Record<string, boolean>

			const newSubscriber = await brevoApi.contacts.createContact({
				email: profile.user.email as string,
				listIds: [2],
				attributes: {
					MAIN_LOCALE: profile.user.lang,
					MAIN_INTEREST: profile.primaryInterest,
					FIRSTNAME: profile.name || profile.user.name,
					HAS_SUBSCRIBE_TO_NEWSLETTER: agreements?.needSubscribeToNewsletter || false,
				},
			})

			const response = await newSubscriber.json()
			console.log('[brevo: newSubscriber: response]', response)
		} catch (error) {
			console.error('[brevo: newSubscriber: error]', error)
		}
	}
}

export default createHandler(ApiRegistrationHandler)
