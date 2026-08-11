import { EventStatus } from "@gdhub-io/gdhub-prisma";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

/**
 * Closes the books on events that are over.
 *
 * A published event whose every session has ended is archived: it stays
 * readable on the web and in the catalogue, but stops appearing as something
 * to attend. Events with no schedule are left alone — they have no end yet.
 *
 * Named `event-reminder` until now, which is what it never did: the reminder
 * logic went away in the App Router migration and only the archiving stayed.
 */
export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("event-archive", async () => {
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
});
