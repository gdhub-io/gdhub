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

const UserEventScheduleItemSchema = z.object({
	id: z.string().optional(),
	title: z.string().optional(),
	description: z.string().optional(),
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

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.schedule.edit", idFrom: "params.id" }),
	withValidation(UserEventScheduleItemSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const data = body as UserEventScheduleItemBody;

	if (!data.startDate || !data.endDate) {
		return apiError.badRequest("Start and end date are required");
	}

	await prisma.eventScheduleItem.create({
		data: {
			eventId: id,
			title: data.title,
			description: data.description,
			url: data.url ?? null,
			address: data.address ?? null,
			directionId: data.directionId,
			format: data.format as EventFormat,
			language: data.language as Language,
			startDate: data.startDate,
			endDate: data.endDate,
			speakers: data.speakers?.length
				? {
						connect: data.speakers.map((speaker) => ({
							id: speaker,
						})),
					}
				: undefined,
		},
	});

	return json({ ok: true });
});
