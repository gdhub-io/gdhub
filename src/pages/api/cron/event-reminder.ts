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
class CronEventReminderHandler {
	@Get()
	@QueueCronLog('event-reminder')
	public async handler() {
		// set closed for old events
		const closedEvents = await prisma.event.updateMany({
			where: {
				status: prismaClient.EventStatus.Published,
				schedule: {
					some: {
						endDate: {
							lt: new Date(),
						},
					},
				},
			},
			data: {
				status: prismaClient.EventStatus.Closed,
			},
		})

		return {
			closedEvents: closedEvents.count,
		}
	}
}

export default createHandler(CronEventReminderHandler)
