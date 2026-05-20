import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const result = await runWithCronLog("event-reminder", async () => {
		const now = new Date();
		const archivedEvents = await prisma.event.updateMany({
			where: {
				status: prismaClient.EventStatus.Published,
				schedule: {
					some: {},
					every: {
						endDate: {
							lt: now,
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
	});

	return json(result ?? null);
}
