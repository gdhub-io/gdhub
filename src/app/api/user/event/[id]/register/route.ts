import { EventMemberStatus, EventStatus } from "@gdhub-io/gdhub-prisma";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

export const POST = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

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

	if (event.status !== EventStatus.Published) {
		return apiError.badRequest("Event is not open for registration");
	}

	const existingMember = await prisma.eventMember.findFirst({
		where: {
			eventId: id,
			userId: currentUser.id as string,
			status: {
				in: [EventMemberStatus.Pending, EventMemberStatus.Approved],
			},
		},
	});

	if (existingMember) {
		return json({ success: true, alreadyRegistered: true });
	}

	const member = await prisma.eventMember.create({
		data: {
			eventId: id,
			userId: currentUser.id as string,
			status: EventMemberStatus.Approved,
		},
	});

	// Notify participant
	try {
		if (currentUser.id) {
			await NovuService.send({
				to: {
					subscriberId: currentUser.id as string,
					email: currentUser.email,
				},
				template: "event-member-registered",
				payload: {
					eventLink: `${process.env.NEXT_PUBLIC_APP_URL}/event/${event.slug}`,
					eventTitle: event.title,
					memberId: currentUser.id,
					memberName: currentUser.name,
				},
			});
		}
	} catch (error) {
		console.error("Failed to send Novu notification to member", error);
	}

	// Notify event creator
	try {
		if (event.createdById) {
			await NovuService.send({
				to: {
					subscriberId: event.createdById,
					email: event.createdBy.email ?? undefined,
				},
				template: "event-owner-new-member",
				payload: {
					eventId: event.id,
					eventTitle: event.title,
					memberId: currentUser.id,
					memberName: currentUser.name,
				},
			});
		}
	} catch (error) {
		console.error("Failed to send Novu notification to event owner", error);
	}

	return json({ success: true, member });
});
