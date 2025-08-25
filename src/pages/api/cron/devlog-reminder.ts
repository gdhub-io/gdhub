import QueueCronLog from '@/decorators/QueueCronLog'
// import { NextAuthGuard } from '@/lib/api-middlewares'
import { NovuService } from '@/services/novu'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import dayjs from 'dayjs'
import { createHandler, Get } from 'next-api-decorators'

const reminderMonth = 3
const diffBetweenLogsInMonths = 1

// @NextAuthGuard('vercel_cron')
class CronDevlogReminderHandler {
	@Get()
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
					// no reports at all
					{
						reports: {
							none: {},
						},
					},
					// has reports but the latest one is older than reminderMonth
					{
						reports: {
							none: {
								publishedAt: {
									gte: dayjs().subtract(reminderMonth, 'month').startOf('day').toDate(),
								},
							},
						},
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
				},
			},
		})

		if (projects.length === 0) {
			return
		}

		// Get logs from the last month to check which projects already received notifications
		const lastLogs = await prisma.queueJobLog.findMany({
			where: {
				name: 'devlog-reminder',
				OR: projects.map((project: { id: string }) => ({
					data: {
						path: ['projectIds'],
						array_contains: [project.id],
					},
				})),
				createdAt: {
					gte: dayjs().subtract(diffBetweenLogsInMonths, 'month').startOf('day').toDate(),
					lt: dayjs().endOf('day').toDate(),
				},
			},
			select: {
				data: true,
			},
		})

		// Extract projectIds from today's logs
		const alreadyNotifiedProjectIds = new Set(
			lastLogs
				.map((log: { data: unknown }) => {
					const data = log.data as any
					const ids = (data?.projectIds ?? []) as string[]
					return Array.isArray(ids) ? ids : []
				})
				.flat()
		)

		console.log(
			`Found ${projects.length} projects without new reports in the last ${reminderMonth} months (skipped ${alreadyNotifiedProjectIds.size})`
		)

		// If all projects have already been notified, skip the rest of the function
		if (alreadyNotifiedProjectIds.size === projects.length) {
			return
		}

		const needToNotifyProjects = []

		for (const project of projects.filter((project: { id: string }) => !alreadyNotifiedProjectIds.has(project.id))) {
			await NovuService.send({
				template: 'share-project-news',
				to: { subscriberId: project.authorId, email: project.author.email || undefined },
				payload: {
					locale: project.author.lang || 'en',
					projectName: project.name,
					addDevlogPostUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my/projects/${project.slug}`,
				},
			})

			needToNotifyProjects.push(project.id)
		}

		// Return projectIds to be saved in the log by the decorator
		return { projectIds: needToNotifyProjects }
	}
}

export default createHandler(CronDevlogReminderHandler)
