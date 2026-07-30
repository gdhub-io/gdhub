import { UserRole } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const EventMembersMessageSchema = z.object({
	memberIds: z.array(z.string()),
	message: z.string(),
});

type EventMembersMessageBody = z.infer<typeof EventMembersMessageSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(EventMembersMessageSchema)(
		async (_req, ctx, { user, body }) => {
			const currentUser = user as SessionUser | undefined;
			if (!currentUser) return apiError.unauthorized();

			const { id } = (await ctx.params) as { id: string };
			const data = body as EventMembersMessageBody;
			const isAdmin = currentUser.roles?.includes(UserRole.Admin);

			const event = await prisma.event.findUnique({
				where: { id },
				include: {
					createdBy: {
						select: {
							id: true,
							email: true,
							name: true,
						},
					},
				},
			});

			if (!event) {
				return apiError.notFound("Event not found");
			}

			if (!isAdmin && event.createdById !== currentUser.id) {
				return apiError.forbidden("You are not allowed to send messages");
			}

			const members = await prisma.eventMember.findMany({
				where: {
					eventId: id,
					id: { in: data.memberIds },
				},
				include: {
					user: {
						select: {
							id: true,
							email: true,
							name: true,
						},
					},
				},
			});

			await Promise.all(
				members.map((member) =>
					NovuService.send({
						to: {
							subscriberId: member.user.id,
							email: member.user.email ?? undefined,
						},
						template: "event-member-message",
						payload: {
							eventId: event.id,
							eventTitle: event.title,
							eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/event/${event.slug}`,
							message: data.message,
							memberId: member.user.id,
							memberName: member.user.name,
							senderId: currentUser.id,
							senderName: currentUser.name,
						},
					}),
				),
			);

			return json({ success: true, sent: members.length });
		},
	),
);
