import AirtableService from '@services/airtable'
import TelegramService from '@services/telegram'
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
					message: 'Данные уже синхронизированы, ' + userProfile.get('Name'),
				})
			} else {
				await AirtableService('Profiles').update(userProfile.id, {
					'Telegram Chat ID': message.chat.id,
				})

				await telegramService.sendMessage({
					chatId: message.chat.id,
					message: 'Ваш аккаунт синхронизирован, ' + userProfile.get('Name') + '.  Теперь сможем общаться.',
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
					message: `Доброго времени суток, ${message.from.first_name}. Для получения доступа к порталу gdhub.io необходима регистрация.`,
					options: {
						inline_keyboard: [[{ text: 'Зарегистрироваться', url: 'https://gdhub.io/' }]],
					},
				})
			} else {
				if (userProfile.get('Telegram Chat ID') !== message.chat.id) {
					await telegramService.sendMessage({
						chatId: message.chat.id,
						message: `Доброго времени суток, ${message.from.first_name}. Для работы с ботом необходимо синхронизировать ваш аккаунт.`,
						options: {
							inline_keyboard: [[{ text: 'Синхронизировать', callback_data: 'syncme' }]],
						},
					})

					return res.end()
				}

				await telegramService.sendMessage({
					chatId: message.chat.id,
					message: `Доброго времени суток, ${message.from.first_name}. Добро пожаловать в чат бота Геймхаба`,
					options: {
						inline_keyboard: [[{ text: 'Открыть Хаб', web_app: { url: 'https://gdhub.io' } }]],
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
				message: 'Ваш аккаунт синхронизирован, ' + userProfile.get('Name') + '.  Теперь сможем общаться.',
			})
		}

		res.end()
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
