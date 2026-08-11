import { EventStatus, EventType } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

const EventsQuerySchema = z.object({
	status: z
		.enum(Object.values(EventStatus) as [string, ...string[]])
		.optional(),
	type: z.enum(Object.values(EventType) as [string, ...string[]]).optional(),
});

type EventsQuery = z.infer<typeof EventsQuerySchema>;

/**
 * The whole catalogue for moderation — drafts included, which is exactly what
 * the public `/api/events` refuses to serve. That is the difference between the
 * two, and the reason this one sits behind `admin.events.view`.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.events.view" }),
	withValidation(EventsQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { status, type } = body as EventsQuery;

	const events = await prisma.event.findMany({
		where: {
			status: status ? (status as EventStatus) : undefined,
			type: type ? (type as EventType) : undefined,
		},
		orderBy: { createdAt: "desc" },
		include: {
			createdBy: { select: { id: true, name: true, image: true } },
			schedule: {
				orderBy: { startDate: "asc" },
				select: { startDate: true, endDate: true, directionId: true },
			},
			_count: { select: { members: true } },
		},
	});

	return json(events);
});
