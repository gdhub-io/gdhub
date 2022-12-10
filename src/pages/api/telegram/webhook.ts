import AirtableService from '@services/airtable'
import TelegramService from '@services/telegram'
import { NextApiRequest, NextApiResponse } from 'next'

type TelegramMessage = {
	date: number
	text: string
	[key: string]: any
	message_id: number
	from: {
		[key: string]: any
		username: string
		is_bot: boolean
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
		const { message }: TelegramUpdate = req.body

		console.log('update', message)

		if (message?.text === '/b' && message.entities[0].type === 'bot_command') {
			// await TelegramService.sendMessage(message.chat.id, 'you sent me: ' + message.text)

      await AirtableService('Users')
		}

		res.end()
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
