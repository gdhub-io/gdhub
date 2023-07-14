import AirtableService from '@/services/airtable'
import TelegramService from '@/services/telegram'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST' || req.headers['authorization'] !== process.env.BACKEND_KEY)
		throw new Error('Forbidden request')

	try {
		const chatId = process.env.TELEGRAM_CHAT_ID ? Number.parseInt(process.env.TELEGRAM_CHAT_ID) : undefined
		if (!chatId) throw new Error('Unknown chat')

		const newSpecialities = []
		const newMembers = await AirtableService('Profiles')
			.select({
				fields: ['Specialities'],
				filterByFormula: `AND( DATETIME_DIFF(DATEADD(TODAY(),-1,'days'), Created, 'days') < 3, Specialities )`,
			})
			.all()

		console.log('new members found', newMembers.length)

		if (newMembers?.length == 0) {
			res.json({ success: true })
			return
		}

		for (const member of newMembers) {
			const _specialities = member.fields.Specialities as string[]
			const specs = await AirtableService('Specialities')
				.select({
					fields: ['Name'],
					filterByFormula: `FIND(RECORD_ID(), "${_specialities.join(' ')}")`,
				})
				.all()

			for (const spec of specs) {
				newSpecialities.push(spec.fields.Name)
			}
		}

		const finishMessage = [
			'Бывает же такое!',
			'Добро пожаловать в наш хаб!',
			'Теперь-то начнем делать игры по-серъезному!',
			'Ура! Своих прибавилось!',
			'Сообщество растет. Приятно :)',
		]
		const randomInt = Math.floor(Math.random() * (finishMessage.length - 1))
		const newSpecialitiesRender = newSpecialities.join(';\n- ')

		const telegramBot = TelegramService.init()
		await telegramBot.sendMessage({
			chatId,
			topicId: process.env.TELEGRAM_TOPIC_NEWS ? Number.parseInt(process.env.TELEGRAM_TOPIC_NEWS) : undefined,
			message: `<b>Новые участники сообщества</b>\n\nК сообществу присоединилось <b>+${newMembers.length} участника</b> имеющие такие специальности, как:\n- ${newSpecialitiesRender}\n\n${finishMessage[randomInt]}`,
		})

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
