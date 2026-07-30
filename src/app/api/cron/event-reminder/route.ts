import { EventStatus } from "@gdhub-io/gdhub-prisma";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const result = await runWithCronLog("event-reminder", async () => {
		const now = new Date();
		const archivedEvents = await prisma.event.updateMany({
			where: {
				status: EventStatus.Published,
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
				status: EventStatus.Archived,
			},
		});

		return {
			archivedEvents: archivedEvents.count,
		};
	});

	return json(result ?? null);
}
