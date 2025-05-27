import QueueCronLog from '@/decorators/QueueCronLog'
// import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { createHandler, Get } from 'next-api-decorators'

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
