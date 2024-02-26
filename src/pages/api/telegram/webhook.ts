import AirtableService from '@/services/airtable'
import TelegramService from '@/services/telegram'
import { NextApiRequest, NextApiResponse } from 'next'

// https://core.telegram.org/bots/api#message
type TelegramMessage = {
	[key: string]: any
	date: number
	text: string
	message_id: number
	message_thread_id?: number
	is_topic_message?: boolean
	from: {
		[key: string]: any
		username: string
		is_bot: boolean
		first_name: string
	}
	chat: {
		[key: string]: any
		id: number
		username: string
		type: 'private'
	}
	entities: {
		[key: string]: any
		type: 'hashtag' | 'bot_command' | 'mention' | 'cashtag' | 'url' | 'email' | any
	}
}

type TelegramUpdate = {
	[key: string]: any
	update_id: number
	message?: TelegramMessage
	channel_post?: TelegramMessage
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST' || req.headers['x-telegram-bot-api-secret-token'] !== 'secret_token')
		throw new Error('Forbidden request')

	try {
		const { message, callback_query }: TelegramUpdate = req.body
		const telegramService = await TelegramService.init()

		console.log('update', message, callback_query)

		if (message?.text === '/syncme' && message.entities[0].type === 'bot_command' && message.chat.type === 'private') {
			const [userProfile] = await AirtableService('Profiles')
				.select({
					maxRecords: 1,
					filterByFormula: `{Telegram Nickname} = "${message.from.username}"`,
				})
				.all()

			if (!userProfile) {
				await telegramService.sendMessage({
					chatId: message.chat.id,
					message: 'I dont know how are you. You need register to https://gdhuv.io',
				})

				res.end()
			}

			if (userProfile.get('Telegram Chat ID') === message.chat.id) {
				await telegramService.sendMessage({
					chatId: message.chat.id,
					message: 'Data is already synchronized, ' + userProfile.get('Name'),
				})
			} else {
				await AirtableService('Profiles').update(userProfile.id, {
					'Telegram Chat ID': message.chat.id,
				})

				await telegramService.sendMessage({
					chatId: message.chat.id,
					message: 'Your account is synced, ' + userProfile.get('Name') + '.  Now we can communicate.',
				})
			}
		}

		if (message?.text === '/start' && message.entities[0].type === 'bot_command' && message.chat.type === 'private') {
			const [userProfile] = await AirtableService('Profiles')
				.select({
					maxRecords: 1,
					filterByFormula: `{Telegram Nickname} = "${message.from.username}"`,
				})
				.all()

			if (!userProfile) {
				await telegramService.sendMessage({
					chatId: message.chat.id,
					message: `Good day, ${message.from.first_name}. Registration is required to gain access to the gdhub.io portal.`,
					options: {
						inline_keyboard: [[{ text: 'Register', url: 'https://gdhub.io/' }]],
					},
				})
			} else {
				if (userProfile.get('Telegram Chat ID') !== message.chat.id) {
					await telegramService.sendMessage({
						chatId: message.chat.id,
						message: `Good day, ${message.from.first_name}. To work with the bot you need to synchronize your account.`,
						options: {
							inline_keyboard: [[{ text: 'Sync', callback_data: 'syncme' }]],
						},
					})

					return res.end()
				}

				await telegramService.sendMessage({
					chatId: message.chat.id,
					message: `Good day, ${message.from.first_name}. Welcome to the Gamehub bot chat`,
					options: {
						inline_keyboard: [[{ text: 'Open the Hub', web_app: { url: 'https://gdhub.io' } }]],
					},
				})
			}
		}

		if (callback_query?.data === 'syncme') {
			const [userProfile] = await AirtableService('Profiles')
				.select({
					maxRecords: 1,
					filterByFormula: `{Telegram Nickname} = "${callback_query.from.username}"`,
				})
				.all()

			await AirtableService('Profiles').update(userProfile.id, {
				'Telegram Chat ID': callback_query.message.chat.id,
			})

			await telegramService.sendMessage({
				chatId: callback_query.message.chat.id,
				message: 'Your account is synced, ' + userProfile.get('Name') + '.  Now we can communicate.',
			})
		}

		res.end()
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
