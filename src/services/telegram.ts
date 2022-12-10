/**
 * Docs page https://telegram-bot-sdk.readme.io/reference/sendmessage
 * Telegram Bot API Docs https://core.telegram.org/bots/api#formatting-options
 */

import fetch from 'node-fetch'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string
const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}`

export default class TelegramService {
	static async sendMessage(chatId: number, message: any, options?: Record<string, any>) {
		let body: any = {
			chat_id: chatId,
			// message_thread_id: '',
			parse_mode: 'HTML',
			disable_notification: process.env.TELEGRAM_DISABLE_NOTIFICATIONS || false,
			text: message, //1-4096 characters
		}

		if (options) {
			body.reply_markup = options
		}

		try {
			fetch(`${telegramApiUrl}/sendMessage`, {
				method: 'post',
				body: JSON.stringify(body),
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
				},
			})
				.then((res: any) => res.json())
				.then((data: any) => {
					console.log('Message successfully send.')
				})
				.catch((error) => {
					console.log(error)
				})
		} catch (error: any) {
			console.log(error)
		}
	}

	static async sendPhoto(chatId: number, url: string, message?: string) {
		const body = JSON.stringify({
			chat_id: chatId,
			// message_thread_id: '',
			photo: url,
			caption: message, //0-1024 characters
			parse_mode: 'HTML',
			disable_notification: process.env.TELEGRAM_DISABLE_NOTIFICATIONS || false,
		})

		try {
			fetch(`${telegramApiUrl}/sendPhoto`, {
				method: 'post',
				body: body,
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
				},
			})
				.then((res: any) => res.json())
				.then((data: any) => {
					console.log('Photo successfully send.')
				})
				.catch((error) => {
					console.log(error)
				})
		} catch (error: any) {
			console.log(error)
		}
	}
}
