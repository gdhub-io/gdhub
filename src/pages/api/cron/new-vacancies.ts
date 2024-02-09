import { env } from '@/helpers/env'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import TelegramService from '@/services/telegram'
import dayjs from 'dayjs'
import { Post, Query, createHandler } from 'next-api-decorators'

class CronProjectReportsDto {
	inLastDays: number
}

@NextAuthGuard('public_api')
class CronNewVacanciesHandler {
	@Post()
	public async handler(@Query() { inLastDays = 1 }: CronProjectReportsDto) {
		const projectWithVacancies = await prisma.project.findMany({
			where: {
				vacancies: { some: { publishedAt: { gte: dayjs().subtract(inLastDays, 'd').toDate() } } },
			},
			include: { vacancies: true, _count: { select: { vacancies: true } } },
		})

		console.log('New projects with vacancies were found: ', projectWithVacancies.length)

		const finishMessage =
			'<i>p.s. Откликнуться на вакансию можно на странице проекта. Для этого необходимо кликнуть на его название.</i>'

		const newVacanciesRender = () => {
			let output = ''

			projectWithVacancies.map((project) => {
				const vacancyNames = project.vacancies.map((v) => v.title)

				output += `\n\n<b><a href="https://gdhub.io/project/${project.slug}">Проект ${project.name}</a></b>\n`
				output += '- ' + vacancyNames.join('\n- ')
			})

			return output
		}

		const telegramBot = TelegramService.init()
		await telegramBot.sendMessage({
			chatId: env<number>('TELEGRAM_CHAT_ID'),
			topicId: env<number>('TELEGRAM_TOPIC_VACANCIES'),
			message: `🔥 <b>Новые вакансии на проекты сообщества</b>${newVacanciesRender()}\n\n${finishMessage}`,
		})
	}
}

export default createHandler(CronNewVacanciesHandler)

// import AirtableService from '@/services/airtable'
// import TelegramService from '@/services/telegram'
// import { NextApiRequest, NextApiResponse } from 'next'

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// 	if (req.method !== 'POST' || req.headers['authorization'] !== process.env.BACKEND_KEY)
// 		throw new Error('Forbidden request')

// 	try {
// 		const chatId = process.env.TELEGRAM_CHAT_ID ? Number.parseInt(process.env.TELEGRAM_CHAT_ID) : undefined
// 		if (!chatId) throw new Error('Unknown chat')

// 		const newVacancies = await AirtableService('Project Vacancies')
// 			.select({
// 				filterByFormula: `AND(Status = "Opened", {Published At}, DATETIME_DIFF(TODAY(), {Published At}, 'hours') <= 24)`,
// 			})
// 			.all()

// 		console.log('new vacancies found', newVacancies.length)

// 		if (newVacancies?.length == 0) {
// 			res.json({ success: true })
// 			return
// 		}

// 		/** Get projects with vacancies */
// 		const projects: { name: string; slug: string }[] = []
// 		newVacancies.forEach((vac) => {
// 			const projectNames = projects.map((p) => p.name)
// 			const vacName = vac.get('Project Name')?.toString()
// 			if (vacName && !projectNames.includes(vacName)) {
// 				projects.push({
// 					name: vac.get('Project Name')?.toString() || '',
// 					slug: vac.get('Project Slug')?.toString() || '',
// 				})
// 			}
// 		})

// 		const finishMessage =
// 			'<i>p.s. Откликнуться на вакансию можно на странице проекта. Для этого необходимо кликнуть на его название.</i>'

// 		const newVacanciesRender = () => {
// 			let output = ''

// 			projects.map((project) => {
// 				const vacancyNames = newVacancies
// 					.filter((v) => v.get('Project Name')?.toString() == project.name)
// 					.map((v) => v.fields.Name)

// 				output += `\n\n<b><a href="https://gdhub.io/project/${project.slug}">Проект ${project.name}</a></b>\n`
// 				output += '- ' + vacancyNames.join('\n- ')
// 			})

// 			return output
// 		}

// 		const telegramBot = TelegramService.init()
// 		await telegramBot.sendMessage({
// 			chatId,
// 			topicId: process.env.TELEGRAM_TOPIC_VACANCIES ? Number.parseInt(process.env.TELEGRAM_TOPIC_VACANCIES) : undefined,
// 			message: `🔥 <b>Новые вакансии на проекты сообщества</b>${newVacanciesRender()}\n\n${finishMessage}`,
// 		})

// 		res.json({ success: true })
// 	} catch (error: any) {
// 		res.json({ success: false, error: error.message })
// 	}
// }
