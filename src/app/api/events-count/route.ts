import type { EventStatus, Language, Prisma } from "@gdhub-io/gdhub-prisma";
import { visibleEventStatuses } from "@/helpers/event";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	type EventsCountQuery,
	EventsCountQuerySchema,
	EventTimeStatus,
} from "@/schemas/events";
import { isStaff } from "@/services/access";
import { prisma } from "@/services/prisma";

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "hub.events.view" }),
	withValidation(EventsCountQuerySchema, "query"),
)(async (_req, _ctx, { body, access }) => {
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

	// Same rule as the listing: a caller-chosen status filters what the hub
	// shows, it does not open a count of everyone's drafts.
	const visible = visibleEventStatuses(
		status,
		!!access && isStaff(access),
	) as EventStatus[];

	if (!visible.length) return json({ count: 0 });

	const eventCount = await prisma.event.count({
		where: {
			lang: lang ? { equals: lang as Language } : undefined,
			status: { in: visible },
		},
	});

	return json({ count: eventCount });
});
