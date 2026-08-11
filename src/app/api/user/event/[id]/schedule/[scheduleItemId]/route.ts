import { EventFormat, Language } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

/**
 * The modal always submits the whole item, so this is a replace rather than a
 * patch — and the optional text fields have to accept `null`, which is what
 * clearing one produces.
 */
const UserEventScheduleItemSchema = z.object({
	id: z.string().optional(),
	title: z.string().nullish(),
	description: z.string().nullish(),
	url: z.string().nullish(),
	address: z.string().nullish(),
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

type UserEventScheduleItemBody = z.infer<typeof UserEventScheduleItemSchema>;

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.schedule.edit", idFrom: "params.id" }),
	withValidation(UserEventScheduleItemSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id, scheduleItemId } = (await ctx.params) as {
		id: string;
		scheduleItemId: string;
	};
	const data = body as UserEventScheduleItemBody;

	await prisma.eventScheduleItem.update({
		where: {
			id: scheduleItemId,
			eventId: id,
		},
		data: {
			// `?? null` rather than passing it straight through: Prisma skips an
			// `undefined`, so emptying a field left the old value in the column
			// and the edit looked like it had not saved at all.
			title: data.title ?? null,
			description: data.description ?? null,
			url: data.url ?? null,
			address: data.address ?? null,
			directionId: data.directionId,
			format: data.format as EventFormat,
			language: data.language as Language,
			startDate: data.startDate,
			endDate: data.endDate,
			speakers: data.speakers?.length
				? {
						set: data.speakers.map((speakerId) => ({
							id: speakerId,
						})),
					}
				: { set: [] },
		},
	});

	return json({ success: true });
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.schedule.edit", idFrom: "params.id" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id, scheduleItemId } = (await ctx.params) as {
		id: string;
		scheduleItemId: string;
	};

	await prisma.eventScheduleItem.delete({
		where: {
			id: scheduleItemId,
			eventId: id,
		},
	});

	return json({ success: true });
});
