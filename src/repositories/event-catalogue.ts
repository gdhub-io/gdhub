import { EventStatus } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";

/** The two statuses the event page itself treats as public. */
const PUBLIC_STATUSES: EventStatus[] = [
	EventStatus.Published,
	EventStatus.Archived,
];

/**
 * The catalogue both events pages show.
 *
 * One query for the public page and the hub's, because they are the same list
 * and drifted when they were not: the hub read `/api/events`, whose time filter
 * requires a schedule, so an event with no dates yet vanished there while the
 * public page still listed it.
 */
export async function loadEventCatalogue() {
	const events = await prisma.event.findMany({
		where: { status: { in: PUBLIC_STATUSES } },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			slug: true,
			title: true,
			shortDescription: true,
			type: true,
			lang: true,
			image: true,
			isFeatured: true,
			schedule: {
				orderBy: { startDate: "asc" },
				select: { startDate: true, endDate: true, directionId: true },
			},
		},
	});

	// Dates cross the server/client boundary as strings; the cards format them.
	return events.map((event) => ({
		...event,
		schedule: event.schedule.map((item) => ({
			startDate: item.startDate.toISOString(),
			endDate: item.endDate.toISOString(),
			directionId: item.directionId,
		})),
	}));
}
