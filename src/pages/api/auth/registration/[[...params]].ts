import { env } from '@/helpers/env'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import Cryptr from 'cryptr'
import cryptr from 'cryptr'
import dayjs from 'dayjs'
import { BadRequestException, Body, Param, Post, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('public_api')
class ApiRegistrationHandler {
	constructor() {}

	@Post('/onboarding/profile')
	public async saveOnboardingProfile(@Req() req: NextApiRequestWithUser, @Body() body: Record<string, any>) {
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
		const string = `${email}${dayjs(registration.createdAt).unix()}${registration.signature}`

		if (cryptr.decrypt(registrationToken) !== string) {
			throw new BadRequestException('You are using an incorrect registration link or anemail')
		}

		const user = await prisma.user.create({
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

		if (user) {
			await prisma.registration.delete({ where: { id: registration.id } })
		}

		return { userId: user.id }
	}
}

export default createHandler(ApiRegistrationHandler)
