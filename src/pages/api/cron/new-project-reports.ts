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
class CronProjectReportsHandler {
	@Post()
	public async revalidatePage(@Query() { inLastDays = 1 }: CronProjectReportsDto) {
		const reports = await prisma.projectReport.findMany({
			where: {
				publishedAt: { gte: dayjs().subtract(inLastDays, 'd').toDate() },
			},
			include: { project: { include: { stage: { include: { season: true } } } } },
		})

		console.log('New project reports were found: ', reports.length)

		const newProjectReportsRender = () => {
			let output = ''

			reports.map((report) => {
				output += `\n\n<b>Проект ${report.project.name}</b> / ${report.project.stage.season.name}\n`
				output += '<i>Отчет от: ' + dayjs(report.publishedAt).format('ll') + '</i>\n\n'
				output += '- ' + report.content
				output += report.video
					? `\n<a href="${'https://www.youtube.com/watch?v=' + report.video}">Прикрепленное видео</a>`
					: ''
				output += `\n<a href="https://gdhub.io/project/${report.project.slug}">Читать дальше</a>`
			})

			return output
		}

		const telegramBot = TelegramService.init()
		const finishMessage = '<i>p.s. Полный текст отчетов смотрите на страницах проектов.</i>'
		await telegramBot.sendMessage({
			chatId: env<number>('TELEGRAM_CHAT_ID'),
			topicId: env<number>('TELEGRAM_TOPIC_REPORTS'),
			message: `<b>Новое на проектах сообщества</b>${newProjectReportsRender()}\n\n${finishMessage}`,
		})
	}
}

export default createHandler(CronProjectReportsHandler)
