import { env } from '@/helpers/env'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import Cryptr from 'cryptr'
import dayjs from 'dayjs'
import { BadRequestException, Body, Get, Post, Query, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('public_api')
class ApiRegistrationHandler {
	@Get('/onboarding/profile')
	public async getOnboardingProfile(
		@Req() req: NextApiRequestWithUser,
		@Query('registrationToken') registrationToken: string
	) {
		const registration = await prisma.registration.findUnique({ where: { registrationToken } })

		const cryptr = new Cryptr(env('NEXTAUTH_SECRET'))
		const sourceToken = cryptr.decrypt(registrationToken)
		const [email] = sourceToken.split(
			dayjs(registration?.createdAt)
				.unix()
				.toString()
		)

		const user = await prisma.user.findUnique({
			where: { email },
			include: {
				profile: { select: { country: true, city: true, yearOfBirth: true, agreements: true } },
				specialities: { take: 1 },
			},
		})

		return user
	}

	@Post('/onboarding/profile')
	public async saveOnboardingProfile(@Req() req: NextApiRequestWithUser, @Body() body: Record<string, any>) {
		let user: any = null
		const {
			firstName,
			lastName,
			email,
			yearOfBirth,
			country,
			city,
			confirmUserData,
			agreeWithTermsAndPrivacy,
			needSubscribeToNewsletter,
			registrationToken,
		} = body

		const registration = await prisma.registration.findUnique({ where: { registrationToken } })

		if (!registration) {
			throw new BadRequestException('Registration token is worng')
		}

		if (dayjs(registration.expires).diff() <= 0) {
			await prisma.registration.delete({ where: { registrationToken } })
			throw new BadRequestException('Registration token is worng')
		}

		const cryptr = new Cryptr(env('NEXTAUTH_SECRET'))
		const sourceToken = `${email}${dayjs(registration.createdAt).unix()}${registration.signature}`

		if (cryptr.decrypt(registrationToken) !== sourceToken) {
			throw new BadRequestException('You are using an incorrect registration link or an email')
		}

		const existedUser = await prisma.user.findUnique({
			where: { email, emailVerified: {} },
			include: { _count: { select: { specialities: true } } },
		})

		if (!existedUser) {
			user = await prisma.user.create({
				data: {
					email,
					emailVerified: registration?.createdAt,
					name: [firstName, lastName].join(' '),
					profile: {
						create: {
							name: [firstName, lastName].join(' '),
							city,
							yearOfBirth,
							country,
							agreements: { confirmUserData, agreeWithTermsAndPrivacy, needSubscribeToNewsletter },
						},
					},
				},
			})
		} else {
			if (existedUser.onboardingDone) {
				throw new BadRequestException('User with the email already exists')
			} else {
				user = await prisma.user.update({
					where: { id: existedUser.id },
					data: {
						name: [firstName, lastName].join(' '),
						profile: {
							update: {
								name: [firstName, lastName].join(' '),
								city,
								yearOfBirth,
								country,
								agreements: { confirmUserData, agreeWithTermsAndPrivacy, needSubscribeToNewsletter },
							},
						},
					},
					include: { specialities: { take: 1 } },
				})
			}
		}

		return { user }
	}
}

export default createHandler(ApiRegistrationHandler)
