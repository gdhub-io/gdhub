import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

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
	type: enumArray(
		Object.values(prismaClient.EventType) as [string, ...string[]],
	),
	withDates: booleanish,
	status: enumArray(
		Object.values(prismaClient.EventStatus) as [string, ...string[]],
	),
	timeStatus: enumArray(
		Object.values(EventTimeStatus) as [string, ...string[]],
	),
	lang: z
		.enum(Object.values(prismaClient.Language) as [string, ...string[]])
		.optional(),
});

type GetEventsQuery = z.infer<typeof GetEventsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		GetEventsQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
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

		const timeWhere: prismaClient.Prisma.EventScheduleItemWhereInput = {
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

		const events = await prisma.event.findMany({
			where: {
				type: type
					? { in: type as prismaClient.$Enums.EventType[] }
					: undefined,
				lang: lang
					? { equals: lang as prismaClient.$Enums.Language }
					: undefined,
				status: preparedStatus
					? { in: preparedStatus as prismaClient.$Enums.EventStatus[] }
					: {
							notIn: [
								prismaClient.$Enums.EventStatus.Closed,
								prismaClient.$Enums.EventStatus.Draft,
							],
						},
				schedule: timeWhere.OR?.length
					? {
							some: timeWhere,
						}
					: undefined,
			},
			include: withDates
				? {
						schedule: { select: { startDate: true, endDate: true } },
					}
				: undefined,
		});

		return json(events);
	}),
);
