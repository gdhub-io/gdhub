import { brevoTemplates } from '@/config/brevo-templates'
import { env } from '@/helpers/env'
import { brevoApi } from '@/services/brevo'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import cryptoRandomString from 'crypto-random-string'
import Cryptr from 'cryptr'
import dayjs from 'dayjs'
import { Body, Post, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class SendRegistrationLinkArgs {
	@IsString()
	email: string
}

class ApiDictGameGenresHandler {
	constructor() {}

	@Post()
	public async sendRegistrationLink(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) { email }: SendRegistrationLinkArgs
	) {
		// Encrypt email
		const cryptr = new Cryptr(process.env.NEXTAUTH_SECRET as string)
		const signature = cryptoRandomString({ length: 32, type: 'alphanumeric' })
		const createdAt = dayjs()
		const registrationToken = cryptr.encrypt(email + createdAt.unix() + signature)

		await prisma.registration.create({
			data: {
				registrationToken,
				signature,
				expires: dayjs().add(7, 'day').toISOString(),
				createdAt: createdAt.toISOString(),
			},
		})

		const link = env('NEXT_PUBLIC_APP_URI') + `/registration?token=${registrationToken}`

		const result = await brevoApi.smtp.sendTransacEmail({
			subject: 'Registration',
			to: [{ email }],
			templateId: brevoTemplates.ru.registration,
			params: {
				link,
			},
		})

		if (result.error) throw Error(result.error.message)

		console.log('Registration link was sent to ' + email)
	}
}

export default createHandler(ApiDictGameGenresHandler)
