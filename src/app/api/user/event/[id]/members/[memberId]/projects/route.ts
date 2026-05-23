import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id, memberId } = (await ctx.params) as {
		id: string;
		memberId: string;
	};
	const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

	const event = await prisma.event.findUnique({
		where: { id },
		select: { createdById: true },
	});

	if (!event) {
		return apiError.notFound("Event not found");
	}

	if (!isAdmin && event.createdById !== currentUser.id) {
		return apiError.forbidden("You are not allowed to view members");
	}

	const member = await prisma.eventMember.findFirst({
		where: { id: memberId, eventId: id },
		select: { userId: true },
	});

	if (!member) {
		return apiError.notFound("Member not found");
	}

	const teamMembers = await prisma.teamMember.findMany({
		where: { userId: member.userId },
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
