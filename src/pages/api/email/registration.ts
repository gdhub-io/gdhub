import { env } from '@/helpers/env'
import { brevoApi } from '@/services/brevo'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import cryptoRandomString from 'crypto-random-string'
import Cryptr from 'cryptr'
import dayjs from 'dayjs'
import { Body, Post, ValidationPipe, createHandler } from 'next-api-decorators'

class SendRegistrationLinkArgs {
	@IsString()
	email: string
}

class ApiDictGameGenresHandler {
	constructor() {}

	@Post()
	public async sendRegistrationLink(@Body(ValidationPipe) { email }: SendRegistrationLinkArgs) {
		// Encrypt email
		const cryptr = new Cryptr(process.env.NEXTAUTH_SECRET as string)
		const sugar = cryptoRandomString({ length: 32, type: 'alphanumeric' })
		const createdAt = dayjs()
		const registrationToken = cryptr.encrypt(email + createdAt.unix() + sugar)

		await prisma.registration.create({
			data: {
				registrationToken,
				expires: dayjs().add(7, 'day').toISOString(),
				createdAt: createdAt.toISOString(),
			},
		})

		const link = env('NEXT_PUBLIC_APP_URI') + `/registration/onboarding?token=${registrationToken}`

		const result = await brevoApi.smtp.sendTransacEmail({
			subject: 'Registration',
			to: [{ email }],
			templateId: 2,
			params: {
				link,
			},
		})

		if (result.error) throw Error(result.error.message)

		console.log('Registration link was sent to ' + email)
	}
}

export default createHandler(ApiDictGameGenresHandler)
