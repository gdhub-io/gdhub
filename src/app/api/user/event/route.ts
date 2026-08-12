import { randomUUID } from "node:crypto";
import { EventFormat, EventType, Language } from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import slugify from "slugify";
import { z } from "zod";
import { userSpacesCacheKey } from "@/app/api/user/spaces/route";
import { SpaceRole } from "@/config/permissions/roles";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { hasQualifiedSpeciality } from "@/repositories/speciality.repository";
import { can, getSpaceAccess, isStaff } from "@/services/access";
import { joinSpace } from "@/services/access/membership";
import { cacheDelete } from "@/services/cache";
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
		.enum(Object.values(EventFormat) as [string, ...string[]])
		.optional(),
	language: z.enum(Object.values(Language) as [string, ...string[]]).optional(),
});

const UserEventCreateSchema = z.object({
	title: z.string(),
	slug: z.string().optional(),
	shortDescription: z.string().optional(),
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	directionId: z.string(),
	lang: z.enum(Object.values(Language) as [string, ...string[]]),
	format: z.enum(Object.values(EventFormat) as [string, ...string[]]),
	url: z.string().optional(),
	image: z.string().optional(),
	type: z.enum(Object.values(EventType) as [string, ...string[]]),
	isFree: z.boolean().optional(),
	schedule: z.array(UserEventScheduleItemSchema).optional(),
});

type UserEventCreateBody = z.infer<typeof UserEventCreateSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(UserEventCreateSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const data = body as UserEventCreateBody;

		const hub = await getSpaceAccess("hub", null, currentUser);
		if (!can(hub, "hub.events.create")) return apiError.forbidden();

		// A direction is not a label on the event, it is a claim of competence in
		// it. The permission says "may create events"; this says "may create this
		// one" — a domain rule, so it holds even where RBAC runs in shadow mode.
		// Staff organise on the platform's behalf and are not held to it.
		const qualified =
			isStaff(hub) ||
			(await hasQualifiedSpeciality(currentUser.id, {
				directionId: data.directionId,
			}));

		if (!qualified) {
			return apiError.forbidden(
				"An event can only be created for a direction you are Experienced or Expert in",
			);
		}

		const event = await prisma.event.create({
			data: {
				type: data.type as EventType,
				title: data.title,
				shortDescription: data.shortDescription,
				description: "", //use content instead
				url: data.url,
				image: data.image,
				lang: data.lang as Language,
				createdById: currentUser.id,
				slug:
					data.slug ||
					slugify(data.title, { lower: true, strict: true }) +
						"-" +
						randomUUID().slice(-6),
			},
		});

		await joinSpace({
			type: "event",
			spaceId: event.id,
			userId: currentUser.id,
			role: SpaceRole.Owner,
		});

		// The switcher lists this now, and a cache that says otherwise for the
		// next minute reads as the space not having been created.
		await cacheDelete(userSpacesCacheKey(currentUser.id));

		if (data.startDate && data.endDate) {
			await prisma.eventScheduleItem.create({
				data: {
					eventId: event.id,
					startDate: dayjs(data.startDate).toISOString(),
					endDate: dayjs(data.endDate).toISOString(),
					directionId: data.directionId,
					language: data.lang as Language,
					format: data.format as EventFormat,
				},
			});
		}

		return json(event);
	}),
);
