import QueueCronLog from '@/decorators/QueueCronLog'
import { NovuService } from '@/services/novu'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import dayjs from 'dayjs'
import { createHandler, Get } from 'next-api-decorators'

const reminderDiffDays = [3, 14]
const maxDaysWithoutResponse = 30

// @NextAuthGuard('vercel_cron')
class CronAdviceRequestReminderHandler {
	@Get()
	@QueueCronLog('advice-request-reminder')
	public async handler() {
		// REMINDER ADVICE REQUESTS
		let needToNotifyAdviceRequests: typeof adviceRequestsToRemind = []

		const adviceRequestsToRemind = await prisma.adviceRequest.findMany({
			where: {
				// approved project
				status: prismaClient.AdviceRequestStatus.Created,
				// is not finished (in development)
				finishedAt: { equals: null },
				OR: reminderDiffDays.map((d) => ({
					createdAt: {
						lt: dayjs().subtract(d, 'day').toDate(),
						gt: dayjs().subtract(maxDaysWithoutResponse, 'day').toDate(),
					},
				})),
			},
			include: {
				toUser: true,
				fromUser: true,
				project: true,
			},
		})

		if (adviceRequestsToRemind.length > 0) {
			const orConditions = []
			for (const r of adviceRequestsToRemind) {
				for (const d of reminderDiffDays) {
					orConditions.push({
						data: {
							path: ['remindedAdviceRequestIds'],
							array_contains: [r.id],
						},
						createdAt: {
							gte: dayjs().subtract(d, 'day').startOf('day').toDate(),
							lt: dayjs().endOf('day').toDate(),
						},
					})
				}
			}

			// Get logs from the reminder days to check which advice requests already received notifications
			const lastLogs = await prisma.queueJobLog.findMany({
				where: {
					name: 'advice-request-reminder',
					OR: orConditions,
				},
				select: {
					data: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
			})

			// Extract projectIds from today's logs
			const alreadyNotifiedAdviceRequestIds = new Set(
				lastLogs
					.map((log: { data: unknown }) => {
						const data = log.data as any
						const ids = (data?.remindedAdviceRequestIds ?? []) as string[]
						return Array.isArray(ids) ? ids : []
					})
					.flat()
			)

			console.log(
				`Found ${adviceRequestsToRemind.length} advice requests to remind (skipped ${alreadyNotifiedAdviceRequestIds.size})`
			)

			// If all projects have already been notified, skip the rest of the function
			needToNotifyAdviceRequests = adviceRequestsToRemind.filter(
				(r: { id: string }) => !alreadyNotifiedAdviceRequestIds.has(r.id)
			)

			for (const adviceRequest of needToNotifyAdviceRequests) {
				// send reminder to the recipient of the advice request
				if (adviceRequest.toUserId) {
					await NovuService.send({
						template: 'default-message',
						to: {
							subscriberId: adviceRequest.toUserId,
							email: adviceRequest.toUser?.email || undefined,
						},
						payload: {
							title: 'You have an unanswered advice request',
							message: `You have an unanswered advice request from ${adviceRequest.project?.name}. Please answer it as soon as possible.`,
							redirectUrl: `https://t.me/gdhub_experts_bot/app?startapp=areq_${adviceRequest.id}`,
							redirectUrlType: 'external',
						},
					})
				}
			}
		}

		// EXPIRED ADVICE REQUESTS

		const expiredAdviceRequests = await prisma.adviceRequest.findMany({
			where: {
				// approved project
				status: prismaClient.AdviceRequestStatus.Created,
				// is not finished (in development)
				finishedAt: { equals: null },
				createdAt: {
					lt: dayjs().subtract(maxDaysWithoutResponse, 'day').toDate(),
				},
			},
			include: {
				toUser: true,
				fromUser: true,
				project: true,
			},
		})

		if (expiredAdviceRequests.length > 0) {
			await prisma.adviceRequest.updateMany({
				where: { id: { in: expiredAdviceRequests.map((r: { id: string }) => r.id) } },
				data: {
					status: prismaClient.AdviceRequestStatus.Closed,
					finishedAt: new Date(),
				},
			})

			for (const adviceRequest of expiredAdviceRequests) {
				// send reminder to the recipient of the advice request
				if (adviceRequest.toUserId) {
					await NovuService.send({
						template: 'default-message',
						to: {
							subscriberId: adviceRequest.toUserId,
						},
						payload: {
							title: 'Advice request expired',
							message: `Advice request to you from ${adviceRequest.project?.name} has expired and was closed.`,
							redirectUrl: null,
						},
					})
				}

				// send reminder to the sender of the advice request
				if (adviceRequest.fromUserId) {
					await NovuService.send({
						template: 'default-message',
						to: {
							subscriberId: adviceRequest.fromUserId,
						},
						payload: {
							title: 'Advice request expired',
							message: `Advice request to mentor ${adviceRequest.toUser?.name} has expired and was closed.`,
							redirectUrl: null,
						},
					})
				}
			}
		}

		return {
			remindedAdviceRequestIds: needToNotifyAdviceRequests.map((r: { id: string }) => r.id),
			expiredAdviceRequestIds: expiredAdviceRequests.map((r: { id: string }) => r.id),
		}
	}
}

export default createHandler(CronAdviceRequestReminderHandler)
