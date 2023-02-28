import AirtableService from '@services/airtable'
import TelegramService from '@services/telegram'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST' || req.headers['authorization'] !== process.env.BACKEND_KEY)
		throw new Error('Forbidden request')

	try {
		const chatId = process.env.TELEGRAM_CHAT_ID ? Number.parseInt(process.env.TELEGRAM_CHAT_ID) : undefined
		if (!chatId) throw new Error('Unknown chat')

		const newVacancies = await AirtableService('Project Vacancies')
			.select({
				filterByFormula: `AND(Status = "Opened", DATETIME_DIFF(TODAY(), {Created At}, 'hours') <= 24)`,
			})
			.all()

		console.log('new vacancies found', newVacancies.length)

		if (newVacancies?.length == 0) {
			res.json({ success: true })
			return
		}

		/** Get projects with vacancies */
		const projects: { name: string; slug: string }[] = []
		newVacancies.forEach((vac) => {
			const projectNames = projects.map((p) => p.name)
			const vacName = vac.get('Project Name')?.toString()
			if (vacName && !projectNames.includes(vacName)) {
				projects.push({
					name: vac.get('Project Name')?.toString() || '',
					slug: vac.get('Project Slug')?.toString() || '',
				})
			}
		})

		const finishMessage =
			'<i>p.s. Откликнуться на вакансию можно на странице проекта. Для этого необходимо кликнуть на его название.</i>'

		const newVacanciesRender = () => {
			let output = ''

			projects.map((project) => {
				const vacancyNames = newVacancies
					.filter((v) => v.get('Project Name')?.toString() == project.name)
					.map((v) => v.fields.Name)

				output += `\n\n<b><a href="https://gdhub.io/project/${project.slug}">Проект ${project.name}</a></b>\n`
				output += '- ' + vacancyNames.join('\n- ')
			})

			return output
		}

		console.log(newVacanciesRender())

		const telegramBot = TelegramService.init()
		await telegramBot.sendMessage({
			chatId,
			topicId: process.env.TELEGRAM_TOPIC_VACANCIES ? Number.parseInt(process.env.TELEGRAM_TOPIC_VACANCIES) : undefined,
			message: `<b>Новые вакансии на проекты сообщества</b>${newVacanciesRender()}\n\n${finishMessage}`,
		})

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
