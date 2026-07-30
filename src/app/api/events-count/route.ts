import {
	EventStatus,
	type Language,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import {
	type EventsCountQuery,
	EventsCountQuerySchema,
	EventTimeStatus,
} from "@/schemas/events";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(
	withValidation(
		EventsCountQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const query = body as EventsCountQuery;
		const {
			status,
			timeStatus = [
				EventTimeStatus.Upcoming,
				EventTimeStatus.Ongoing,
				EventTimeStatus.Past,
			],
			lang,
		} = query;

		// The timeWhere block is preserved verbatim from the original handler
		// even though it is currently unused in the count query below. Cleanup
		// is intentionally deferred to avoid behavioral drift during migration.
		const timeWhere: Prisma.EventScheduleItemWhereInput = {
			startDate: { lt: new Date() },
		};

		if (timeStatus.includes(EventTimeStatus.Ongoing)) {
			timeWhere.startDate = { lte: new Date() };
			timeWhere.endDate = { gte: new Date() };
		}
		if (timeStatus.includes(EventTimeStatus.Past)) {
			timeWhere.endDate = { lt: new Date() };
		}
		if (timeStatus.includes(EventTimeStatus.Upcoming)) {
			timeWhere.startDate = { gte: new Date() };
		}
		if (
			timeStatus.includes(EventTimeStatus.Upcoming) &&
			timeStatus.includes(EventTimeStatus.Ongoing)
		) {
			timeWhere.OR = [
				{
					OR: [
						{ startDate: { gte: new Date() } },
						{ startDate: { lt: new Date() }, endDate: { gte: new Date() } },
					],
				},
			];
		}

		const eventCount = await prisma.event.count({
			where: {
				lang: lang ? { equals: lang as Language } : undefined,
				status: status
					? { in: status as EventStatus[] }
					: {
							in: [EventStatus.Published, EventStatus.Archived],
						},
			},
		});

		return json({ count: eventCount });
	}),
);
