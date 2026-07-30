import { EventFormat, Language } from "@gdhub-io/gdhub-prisma";
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
		.enum(Object.values(EventFormat) as [string, ...string[]])
		.optional(),
	language: z.enum(Object.values(Language) as [string, ...string[]]).optional(),
});

type UserEventScheduleItemBody = z.infer<typeof UserEventScheduleItemSchema>;

export const PUT = withAuth({ mode: "user" })(
	withValidation(UserEventScheduleItemSchema)(
		async (_req, ctx, { user, body }) => {
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
					title: data.title,
					description: data.description,
					url: data.url,
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
		},
	),
);

export const DELETE = withAuth({ mode: "user" })(
	async (_req, ctx, { user }) => {
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
	},
);
