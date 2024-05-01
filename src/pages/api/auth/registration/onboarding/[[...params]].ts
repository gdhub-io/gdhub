import { getServerLocale } from '@/helpers/format'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UpdateProfileDto } from '@/types/dto/profile'
import { CreateSpecialityDto, UpdateSpecialityDto } from '@/types/dto/speciality'
import { PrimaryInterest, UserRole } from '@prisma/client'
import { Body, Get, Post, Put, Req, ValidationPipe, createHandler } from 'next-api-decorators'

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
		const locale = getServerLocale(req)
		const { name, yearOfBirth, country, city, confirmUserData, agreeWithTermsAndPrivacy, needSubscribeToNewsletter } =
			body

		const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { profile: true } })
		const agreements: any = user?.agreements

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
					user: { connect: { id: req.user.id } },
				},
			})

			await prisma.user.update({ where: { id: req.user.id }, data: { agreements } })
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
		let role: UserRole = UserRole.Guest

		switch (primaryInterest) {
			case PrimaryInterest.Specialist: {
				role = UserRole.Member
				break
			}
			case PrimaryInterest.Author: {
				role = UserRole.Author
				break
			}
			case PrimaryInterest.Mentor: {
				role = UserRole.Mentor
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
					update: { where: { NOT: { roles: { has: UserRole.Author } } }, data: { roles: { push: role } } },
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

		await prisma.profile.update({
			where: { userId: req.user.id },
			data: { timeForWork, otherResources, isActive, user: { update: { onboardingDone: true } } },
		})
	}
}

export default createHandler(ApiRegistrationHandler)
