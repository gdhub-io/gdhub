import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import dayjs from 'dayjs'
import { createHandler, Get } from 'next-api-decorators'

// @NextAuthGuard('vercel_cron')
class CronRelevantVacanciesHandler {
	@Get()
	public async handler() {
		const notRelevantVacancies = await prisma.teamVacancy.findMany({
			where: {
				status: prismaClient.TeamVacancyStatus.Published,
				finishedAt: {
					lt: dayjs().endOf('day').toDate(),
				},
			},
		})

		if (notRelevantVacancies.length === 0) {
			return
		}

		const updatedVacancies = await prisma.teamVacancy.updateMany({
			where: {
				id: { in: notRelevantVacancies.map((vacancy: { id: string }) => vacancy.id) },
			},
			data: { status: prismaClient.TeamVacancyStatus.Closed },
		})

		console.log(`${updatedVacancies.count} vacancies archived`)
	}
}

export default createHandler(CronRelevantVacanciesHandler)
