import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createHandler, Get } from "next-api-decorators";
import QueueCronLog from "@/decorators/QueueCronLog";
// import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from "@/services/prisma";

// @NextAuthGuard('vercel_cron')
class CronEventReminderHandler {
	@Get()
	@QueueCronLog("event-reminder")
	public async handler() {
		// set closed for old events
		const archivedEvents = await prisma.event.updateMany({
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
				status: prismaClient.EventStatus.Archived,
			},
		});

		return {
			archivedEvents: archivedEvents.count,
		};
	}
}

export default createHandler(CronEventReminderHandler);
