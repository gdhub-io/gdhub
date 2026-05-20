import { randomUUID } from "node:crypto";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import dayjs from "dayjs";
import slugify from "slugify";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const UserEventScheduleItemSchema = z.object({
	id: z.string().optional(),
	title: z.string().optional(),
	description: z.string().optional(),
	url: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	speakers: z.preprocess(
		(value) =>
			Array.isArray(value)
				? value.map((v) =>
						typeof v === "string" ? v : (v as { id?: string })?.id,
					)
				: value,
		z.array(z.string()),
	),
	directionId: z.string(),
	format: z
		.enum(
			Object.values(prismaClient.$Enums.EventFormat) as [string, ...string[]],
		)
		.optional(),
	language: z
		.enum(Object.values(prismaClient.$Enums.Language) as [string, ...string[]])
		.optional(),
});

const UserEventCreateSchema = z.object({
	title: z.string(),
	slug: z.string().optional(),
	shortDescription: z.string().optional(),
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	directionId: z.string(),
	lang: z.enum(
		Object.values(prismaClient.$Enums.Language) as [string, ...string[]],
	),
	format: z.enum(
		Object.values(prismaClient.$Enums.EventFormat) as [string, ...string[]],
	),
	url: z.string().optional(),
	image: z.string().optional(),
	type: z.enum(Object.values(prismaClient.EventType) as [string, ...string[]]),
	isFree: z.boolean().optional(),
	schedule: z.array(UserEventScheduleItemSchema).optional(),
});

type UserEventCreateBody = z.infer<typeof UserEventCreateSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(UserEventCreateSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const data = body as UserEventCreateBody;

		const event = await prisma.event.create({
			data: {
				type: data.type as prismaClient.EventType,
				title: data.title,
				shortDescription: data.shortDescription,
				description: "", //use content instead
				url: data.url,
				image: data.image,
				lang: data.lang as prismaClient.$Enums.Language,
				createdById: currentUser.id,
				slug:
					data.slug ||
					slugify(data.title, { lower: true, strict: true }) +
						"-" +
						randomUUID().slice(-6),
			},
		});

		if (data.startDate && data.endDate) {
			await prisma.eventScheduleItem.create({
				data: {
					eventId: event.id,
					startDate: dayjs(data.startDate).toISOString(),
					endDate: dayjs(data.endDate).toISOString(),
					directionId: data.directionId,
					language: data.lang as prismaClient.$Enums.Language,
					format: data.format as prismaClient.$Enums.EventFormat,
				},
			});
		}

		return json(event);
	}),
);
