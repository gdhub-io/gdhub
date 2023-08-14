import AirtableService from '@/services/airtable'
import TelegramService from '@/services/telegram'
import dayjs from 'dayjs'
import { NextApiRequest, NextApiResponse } from 'next'
import voca from 'voca'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		if (req.method !== 'POST' || req.headers['authorization'] !== process.env.BACKEND_KEY)
			throw new Error('Forbidden request')

		const chatId = process.env.TELEGRAM_CHAT_ID ? Number.parseInt(process.env.TELEGRAM_CHAT_ID) : undefined
		const topicId = process.env.TELEGRAM_TOPIC_REPORTS ? Number.parseInt(process.env.TELEGRAM_TOPIC_REPORTS) : undefined

		if (!chatId || !topicId) throw new Error('Unknown chat')

		const newProjectReports = await AirtableService('Project Reports')
			.select({
				filterByFormula: `AND(DATETIME_DIFF(TODAY(), {Created}, 'days') < 7)`,
			})
			.all()

		console.log('new project reports found', newProjectReports.length)

		if (newProjectReports?.length == 0) {
			res.json({ success: true })
			return
		}

		/** Get projects with vacancies */
		const projects: { name: string; slug: string; desc: string; videoLink: string; season: string; date: string }[] = []
		const projectNames: string[] = []

		newProjectReports.forEach((report) => {
			const projectName = report.get('Project Name')?.toString()
			const reportVideo = report.get('Youtube Video ID') as string

			if (projectName && !projectNames.includes(projectName)) {
				const desc = report.get('Content') as string

				projects.push({
					name: report.get('Project Name')?.toString() || '',
					slug: report.get('Project Slug')?.toString() || '',
					date: report.get('Created')?.toString() || '',
					season: report.get('Season Name')?.toString() || '',
					desc: desc ? voca.truncate(desc, 120, '...') : '',
					videoLink: reportVideo ? `https://www.youtube.com/watch?v=${reportVideo}` : '',
				})
			}
		})

		const newProjectReportsRender = () => {
			let output = ''

			projects.map((project) => {
				output += `\n\n<b>Проект ${project.name}</b> / ${project.season}\n`
				output += '<i>Отчет от: ' + dayjs(project.date).format('LLL') + '</i>\n\n'
				output += '- ' + project.desc
				output += project.videoLink ? `\n<a href="${project.videoLink}">Прикрепленное видео</>` : ''
				output += `\n<a href="https://gdhub.io/project/${project.slug}">Читать дальше</a>`
			})

			return output
		}

		const telegramBot = TelegramService.init()
		const finishMessage = '<i>p.s. Полный текст отчетов смотрите на страницах проектов.</i>'
		await telegramBot.sendMessage({
			chatId,
			topicId,
			message: `🤸 <b>Новое на проектах сообщества</b>${newProjectReportsRender()}\n\n${finishMessage}`,
		})

		res.json({ success: true })
	} catch (error: any) {
		res.json({ success: false, error: error.message })
	}
}
