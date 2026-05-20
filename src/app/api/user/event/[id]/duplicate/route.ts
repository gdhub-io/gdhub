import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const DuplicateEventSchema = z.object({
	lang: z.enum(
		Object.values(prismaClient.$Enums.Language) as [string, ...string[]],
	),
});

type DuplicateEventBody = z.infer<typeof DuplicateEventSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(DuplicateEventSchema)(async (_req, ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { id } = (await ctx.params) as { id: string };
		const { lang } = body as DuplicateEventBody;

		const event = await prisma.event.findUnique({
			where: { id },
			include: {
				schedule: {
					include: {
						speakers: {
							select: {
								id: true,
							},
						},
					},
				},
			},
		});

		if (!event) {
			return apiError.notFound("Event not found");
		}

		const {
			id: _,
			lang: _lang,
			schedule,
			createdAt: _createdAt,
			publishedAt: _publishedAt,
			updatedAt: _updatedAt,
			...data
		} = event;

		const duplicateEvent = await prisma.event.create({
			data: {
				...data,
				status: prismaClient.$Enums.EventStatus.Draft,
				publishedAt: null,
				content: data.content === null ? Prisma.JsonNull : data.content,
				parentId: event.id,
				lang: lang as prismaClient.$Enums.Language,
			},
		});

		if (schedule && schedule.length > 0) {
			for (const item of schedule) {
				const {
					id: _id,
					eventId: _eventId,
					speakers: _speakers,
					...scheduleItemData
				} = item;

				await prisma.eventScheduleItem.create({
					data: {
						eventId: duplicateEvent.id,
						...scheduleItemData,
						speakers:
							item.speakers && item.speakers.length > 0
								? {
										connect: item.speakers.map((speaker) => ({
											id: speaker.id,
										})),
									}
								: undefined,
					},
				});
			}
		}

		return json(duplicateEvent);
	}),
);
