import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const EventMembersBatchUpdateSchema = z.object({
	memberIds: z.array(z.string()),
	projectId: z.string().nullable().optional(),
	mentorIds: z.array(z.string()).optional(),
});

type EventMembersBatchUpdateBody = z.infer<
	typeof EventMembersBatchUpdateSchema
>;

export const POST = withAuth({ mode: "user" })(
	withValidation(EventMembersBatchUpdateSchema)(
		async (_req, ctx, { user, body }) => {
			const currentUser = user as SessionUser | undefined;
			if (!currentUser) return apiError.unauthorized();

			const { id } = (await ctx.params) as { id: string };
			const data = body as EventMembersBatchUpdateBody;
			const isAdmin = currentUser.roles?.includes(prismaClient.UserRole.Admin);

			const event = await prisma.event.findUnique({
				where: { id },
				select: { createdById: true },
			});

			if (!event) {
				return apiError.notFound("Event not found");
			}

			if (!isAdmin && event.createdById !== currentUser.id) {
				return apiError.forbidden("You are not allowed to edit members");
			}

			const members = await prisma.eventMember.findMany({
				where: { id: { in: data.memberIds }, eventId: id },
				select: { id: true, userId: true },
			});

			if (members.length !== data.memberIds.length) {
				return apiError.badRequest("Some members do not belong to this event");
			}

			let teamMemberByUserId = new Map<string, string>();
			if (data.projectId) {
				const teamMembers = await prisma.teamMember.findMany({
					where: {
						userId: { in: members.map((m) => m.userId) },
						team: { projectId: data.projectId },
					},
					select: { id: true, userId: true },
				});

				teamMemberByUserId = new Map(
					teamMembers.map((tm) => [tm.userId, tm.id]),
				);
				const missing = members.filter(
					(m) => !teamMemberByUserId.has(m.userId),
				);
				if (missing.length) {
					return apiError.badRequest(
						"Some selected users are not team members of the chosen project",
					);
				}
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

			const mentorsUpdate =
				data.mentorIds !== undefined
					? { set: data.mentorIds.map((mid) => ({ id: mid })) }
					: undefined;

			if (data.projectId !== undefined || mentorsUpdate) {
				// m2m relation updates can't go through updateMany — per-row update needed.
				await prisma.$transaction(
					members.map((m) =>
						prisma.eventMember.update({
							where: { id: m.id },
							data: {
								...(data.projectId !== undefined
									? {
											teamMemberId: data.projectId
												? (teamMemberByUserId.get(m.userId) ?? null)
												: null,
										}
									: {}),
								...(mentorsUpdate ? { mentors: mentorsUpdate } : {}),
							},
						}),
					),
				);
			}

			return json({ success: true, updated: members.length });
		},
	),
);
