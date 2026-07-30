import { UserRole } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const EventMembersCommonProjectsSchema = z.object({
	memberIds: z.preprocess(
		(value) =>
			Array.isArray(value) ? value : value !== undefined ? [value] : [],
		z.array(z.string()),
	),
});

type EventMembersCommonProjectsQuery = z.infer<
	typeof EventMembersCommonProjectsSchema
>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		EventMembersCommonProjectsSchema,
		"query",
	)(async (_req, ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { id } = (await ctx.params) as { id: string };
		const { memberIds } = body as EventMembersCommonProjectsQuery;
		const isAdmin = currentUser.roles?.includes(UserRole.Admin);

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

		if (!memberIds.length) return json([]);

		const members = await prisma.eventMember.findMany({
			where: { eventId: id, id: { in: memberIds } },
			select: { userId: true },
		});

		if (members.length !== memberIds.length) {
			return apiError.badRequest("Some members do not belong to this event");
		}

		const userIds = members.map((m) => m.userId);

		const teamMembers = await prisma.teamMember.findMany({
			where: { userId: { in: userIds } },
			select: {
				userId: true,
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
		});

		const userProjectsMap = new Map<string, Set<string>>();
		const projectById = new Map<
			string,
			{ id: string; name: string; slug: string }
		>();

		for (const tm of teamMembers) {
			const projectId = tm.team?.projectId;
			const project = tm.team?.project;
			if (!projectId || !project) continue;

			projectById.set(projectId, project);

			if (!userProjectsMap.has(tm.userId)) {
				userProjectsMap.set(tm.userId, new Set());
			}
			userProjectsMap.get(tm.userId)?.add(projectId);
		}

		if (userProjectsMap.size !== userIds.length) {
			return json([]);
		}

		const userProjectSets = Array.from(userProjectsMap.values());
		const [first, ...rest] = userProjectSets;
		const intersection = new Set<string>();
		for (const projectId of first) {
			if (rest.every((set) => set.has(projectId))) {
				intersection.add(projectId);
			}
		}

		return json(
			Array.from(intersection)
				.map((projectId) => projectById.get(projectId))
				.filter(Boolean),
		);
	}),
);
