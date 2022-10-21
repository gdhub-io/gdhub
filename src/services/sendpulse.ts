import { env } from 'process'
import sendpulse from 'sendpulse-api'

type SendEmailInput = {
	html?: string
	text?: string
	subject: string
	auto_plain_text?: boolean
	template?: {
		id: number
		variables?: {
			[key: string]: string
		}
	}
	from: {
		name?: string
		email: string
	}
	to: {
		name?: string
		email: string
	}[]
	bcc?: {
		name?: string
		email: string
	}[]
}

type SendEmailResponse = {
	result: boolean
	id: string
}

type SendEmailError = {
	message: string
	error_code: number
}

class SendpulseService {
	private static async _init() {
		return new Promise((resolve, reject) => {
			try {
				sendpulse.init(env.SENDPULSE_USER_ID, env.SENDPULSE_SECRET, env.SENDPULSE_TOKEN_STORAGE, () => {
					resolve(true)
				})
			} catch (error) {
				console.error(error)
				reject(error)
			}
		})
	}

	static async sendMail(email: SendEmailInput): Promise<SendEmailResponse> {
		await SendpulseService._init()

		return new Promise((resolve, reject) => {
			const sendData = { ...email, auto_plain_text: true }
			console.log('sendMail Request', sendData)

			try {
				sendpulse.smtpSendMail((data: SendEmailResponse | SendEmailError) => {
					if ('error_code' in data) {
						reject(data)
						return
					}

					console.log('sendMail Response', data)
					resolve(data)
				}, sendData)
			} catch (error) {
				console.error(error)
				reject(error)
			}
		})
	}
}

export default SendpulseService
