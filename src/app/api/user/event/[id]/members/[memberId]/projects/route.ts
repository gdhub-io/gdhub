import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { CONFIRMED_STATUS } from "@/repositories/project/team";
import { prisma } from "@/services/prisma";

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.members.view", idFrom: "params.id" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id, memberId } = (await ctx.params) as {
		id: string;
		memberId: string;
	};

	const event = await prisma.event.findUnique({
		where: { id },
		select: { createdById: true },
	});

	if (!event) {
		return apiError.notFound("Event not found");
	}

	const member = await prisma.eventMember.findFirst({
		where: { id: memberId, eventId: id },
		select: { userId: true },
	});

	if (!member) {
		return apiError.notFound("Member not found");
	}

	const teamMembers = await prisma.teamMember.findMany({
		where: { ...CONFIRMED_STATUS, userId: member.userId },
		select: {
			position: true,
			startedAt: true,
			finishedAt: true,
			team: {
				select: {
					projectId: true,
					project: { select: { id: true, name: true, slug: true } },
				},
			},
		},
		orderBy: { startedAt: "desc" },
	});

	const result = teamMembers
		.map((tm) => {
			const project = tm.team?.project;
			if (!project) return null;
			return {
				id: project.id,
				name: project.name,
				slug: project.slug,
				position: tm.position,
				startedAt: tm.startedAt,
				finishedAt: tm.finishedAt,
			};
		})
		.filter(Boolean);

	return json(result);
});
