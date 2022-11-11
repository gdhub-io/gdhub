/**
 * Docs page https://telegram-bot-sdk.readme.io/reference/sendmessage
 * Telegram Bot API Docs https://core.telegram.org/bots/api#formatting-options
 */

import fetch from 'node-fetch'

export default class TelegramService {
	static async sendMessage(message: any) {
		const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string

		const body = JSON.stringify({
			chat_id: process.env.TELEGRAM_CHAT_ID as string,
			// message_thread_id: '',
			parse_mode: 'HTML',
			disable_notification: process.env.TELEGRAM_DISABLE_NOTIFICATIONS || false,
			text: message, //1-4096 characters
		})

		try {
			fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
				method: 'post',
				body: body,
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
				},
			})
				.then((res: any) => res.json())
				.then((data: any) => {
					console.log('data', data)
					console.log('Message successfully send.')
				})
				.catch((error) => {
					console.log(error)
				})
		} catch (error: any) {
			console.log(error)
		}
	}

	static async sendPhoto(url: string, message?: string) {
		const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string

		const body = JSON.stringify({
			chat_id: process.env.TELEGRAM_CHAT_ID as string,
			// message_thread_id: '',
			photo: url,
			caption: message, //0-1024 characters
			parse_mode: 'HTML',
			disable_notification: process.env.TELEGRAM_DISABLE_NOTIFICATIONS || false,
		})

		try {
			fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
				method: 'post',
				body: body,
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
				},
			})
				.then((res: any) => res.json())
				.then((data: any) => {
					console.log('data', data)
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
