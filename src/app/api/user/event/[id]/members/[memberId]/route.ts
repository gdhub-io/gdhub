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

const EventMemberUpdateSchema = z.object({
	projectId: z.string().nullable().optional(),
	mentorIds: z.array(z.string()).optional(),
});

type EventMemberUpdateBody = z.infer<typeof EventMemberUpdateSchema>;

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.members.manage", idFrom: "params.id" }),
	withValidation(EventMemberUpdateSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id, memberId } = (await ctx.params) as {
		id: string;
		memberId: string;
	};
	const data = body as EventMemberUpdateBody;

	const event = await prisma.event.findUnique({
		where: { id },
		select: { createdById: true },
	});

	if (!event) {
		return apiError.notFound("Event not found");
	}

	const member = await prisma.eventMember.findFirst({
		where: { id: memberId, eventId: id },
		select: { id: true, userId: true },
	});

	if (!member) {
		return apiError.notFound("Member not found");
	}

	let teamMemberId: string | null = null;
	if (data.projectId) {
		const teamMembership = await prisma.teamMember.findFirst({
			where: {
				userId: member.userId,
				team: { projectId: data.projectId },
			},
			select: { id: true },
		});

		if (!teamMembership) {
			return apiError.badRequest(
				"This user is not a team member of the selected project",
			);
		}
		teamMemberId = teamMembership.id;
	}

	if (data.mentorIds?.length) {
		const found = await prisma.speciality.findMany({
			where: { id: { in: data.mentorIds } },
			select: { id: true },
		});
		if (found.length !== data.mentorIds.length) {
			return apiError.badRequest("Some mentor specialities were not found");
		}
	}

	await prisma.eventMember.update({
		where: { id: memberId },
		data: {
			teamMemberId: data.projectId !== undefined ? teamMemberId : undefined,
			...(data.mentorIds !== undefined
				? {
						mentors: {
							set: data.mentorIds.map((mid) => ({ id: mid })),
						},
					}
				: {}),
		},
	});

	return json({ success: true });
});
