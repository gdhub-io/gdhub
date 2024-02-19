import { env } from '@/helpers/env'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import TelegramService from '@/services/telegram'
import dayjs from 'dayjs'
import { Post, Query, createHandler } from 'next-api-decorators'

class CronProjectReportsDto {
	inLastDays: number
}

@NextAuthGuard('vercel_cron')
class CronNewSpecialitiesHandler {
	@Post()
	public async handler(@Query() { inLastDays = 1 }: CronProjectReportsDto) {
		const newSpecialities = await prisma.speciality.findMany({
			where: {
				createdAt: { gte: dayjs().subtract(inLastDays, 'd').toDate() },
			},
			include: { user: { include: { profile: true } } },
		})

		console.log('New specialities were found: ', newSpecialities.length)

		const finishMessage = ['Добро пожаловать в наш хаб!']
		const randomInt = Math.floor(Math.random() * (finishMessage.length - 1))
		const newSpecialitiesRender = newSpecialities.map((r) => r.name).join(';\n- ')

		const telegramBot = TelegramService.init()
		await telegramBot.sendMessage({
			chatId: env<number>('TELEGRAM_CHAT_ID'),
			topicId: env<number>('TELEGRAM_TOPIC_NEWS'),
			message: `<b>Новые участники сообщества</b>\n\nК сообществу присоединилось <b>+${newSpecialities.length} участника</b> имеющие такие специальности, как:\n- ${newSpecialitiesRender}\n\n${finishMessage[randomInt]}`,
		})
	}
}

export default createHandler(CronNewSpecialitiesHandler)
