import {
	EventStatus,
	EventType,
	Language,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { isStaff } from "@/services/access";
import { prisma } from "@/services/prisma";

/** The statuses the hub catalogue is allowed to show. */
const LISTABLE: EventStatus[] = [EventStatus.Published, EventStatus.Archived];

enum EventTimeStatus {
	Upcoming = "upcoming",
	Ongoing = "ongoing",
	Past = "past",
}

const enumArray = <T extends [string, ...string[]]>(values: T) =>
	z.preprocess(
		(v) => (v == null ? undefined : Array.isArray(v) ? v : [v]),
		z.array(z.enum(values)).optional(),
	);

const booleanish = z.preprocess((v) => {
	if (typeof v === "boolean") return v;
	if (typeof v === "string") return v === "true";
	return undefined;
}, z.boolean().optional());

const GetEventsQuerySchema = z.object({
	type: enumArray(Object.values(EventType) as [string, ...string[]]),
	withDates: booleanish,
	status: enumArray(Object.values(EventStatus) as [string, ...string[]]),
	timeStatus: enumArray(
		Object.values(EventTimeStatus) as [string, ...string[]],
	),
	lang: z.enum(Object.values(Language) as [string, ...string[]]).optional(),
});

type GetEventsQuery = z.infer<typeof GetEventsQuerySchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "hub.events.view" }),
	withValidation(GetEventsQuerySchema, "query"),
)(async (_req, _ctx, { body, access }) => {
	const query = body as GetEventsQuery;
	const {
		type,
		status,
		timeStatus = [
			EventTimeStatus.Upcoming,
			EventTimeStatus.Ongoing,
			EventTimeStatus.Past,
		],
		withDates = false,
		lang,
	} = query;

	const timeWhere: Prisma.EventScheduleItemWhereInput = {
		OR: [],
	};

	if (timeStatus?.includes(EventTimeStatus.Ongoing)) {
		timeWhere.OR?.push({
			startDate: {
				lte: new Date(),
			},
			endDate: {
				gte: new Date(),
			},
		});
	}

	if (timeStatus?.includes(EventTimeStatus.Past)) {
		timeWhere.OR?.push({
			endDate: {
				lt: new Date(),
			},
		});
	}

	if (timeStatus?.includes(EventTimeStatus.Upcoming)) {
		timeWhere.OR?.push({
			startDate: {
				gte: new Date(),
			},
		});
	}

	const preparedStatus = typeof status === "string" ? [status] : status;

	// `status` is a filter over what the hub shows, never a way to reach into it:
	// asking for `Draft` used to return every organiser's unpublished event.
	// Staff moderate the whole catalogue and are the exception.
	const requested = (preparedStatus as EventStatus[] | undefined) ?? LISTABLE;
	const visible =
		access && isStaff(access)
			? requested
			: requested.filter((value) => LISTABLE.includes(value));

	if (!visible.length) return json([]);

	const events = await prisma.event.findMany({
		where: {
			type: type ? { in: type as EventType[] } : undefined,
			lang: lang ? { equals: lang as Language } : undefined,
			status: { in: visible },
			schedule: timeWhere.OR?.length
				? {
						some: timeWhere,
					}
				: undefined,
		},
		// `directionId` rides along with the dates: a card tints its cover by the
		// craft of the first session, the same way the organiser's own list and
		// the schedule timeline do.
		include: withDates
			? {
					schedule: {
						orderBy: { startDate: "asc" },
						select: { startDate: true, endDate: true, directionId: true },
					},
				}
			: undefined,
		orderBy: { createdAt: "desc" },
	});

	return json(events);
});
