import QueueCronLog from '@/decorators/QueueCronLog'
import { NovuService } from '@/services/novu'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import dayjs from 'dayjs'
import { createHandler, Post } from 'next-api-decorators'

const reminderMonth = 1

class CronDevlogReminderHandler {
	@Post()
	@QueueCronLog('devlog-reminder')
	public async handler() {
		const projects = await prisma.project.findMany({
			where: {
				// approved project
				status: prismaClient.ProjectStatus.Approved,
				// is not finished (in development)
				finishedAt: { equals: null },
				// has active author
				author: {
					profile: { isActive: true },
				},
				OR: [
					// no reports
					{
						reports: {
							none: {},
						},
					},
					// has not any reports in the last 3 months
					{
						AND: [
							{
								reports: {
									some: {},
								},
							},
							{
								reports: {
									none: {
										publishedAt: { gte: dayjs().subtract(reminderMonth, 'month').startOf('day').toDate() },
									},
								},
							},
						],
					},
				],
			},
			include: {
				author: {
					select: {
						id: true,
						email: true,
						lang: true,
					},
				},
				_count: {
					select: {
						reports: true,
					},
				},
				reports: {
					orderBy: {
						publishedAt: 'desc',
					},
					take: 1,
				},
			},
		})

		if (projects.length === 0) {
			return { status: 'success', message: 'No projects found' }
		}

		console.log(`found ${projects.length} projects without new reports in the last ${reminderMonth} months`)

		for (const project of projects) {
			await NovuService.send({
				template: 'share-project-news',
				to: { subscriberId: project.authorId, email: project.author.email || undefined },
				payload: {
					locale: project.author.lang || 'en',
					projectName: project.name,
					addDevlogPostUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my/projects/${project.slug}`,
				},
			})
		}
	}
}

export default createHandler(CronDevlogReminderHandler)
