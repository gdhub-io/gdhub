import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const expert = await prisma.user.findFirst({
		where: {
			id,
			specialities: {
				some: {
					level: {
						in: [
							prismaClient.SkillLevel.Experienced,
							prismaClient.SkillLevel.Expert,
						],
					},
					openForQuestions: { isEmpty: false },
				},
			},
		},
		select: {
			id: true,
			name: true,
			image: true,
			lang: true,
			memberInTeams: {
				select: {
					team: {
						select: {
							project: {
								select: {
									id: true,
									name: true,
									slug: true,
									coverImage: true,
									genre: true,
									platform: true,
								},
							},
						},
					},
				},
			},
			specialities: {
				where: {
					level: {
						in: [
							prismaClient.SkillLevel.Experienced,
							prismaClient.SkillLevel.Expert,
						],
					},
					openForQuestions: { isEmpty: false },
				},
				select: {
					id: true,
					name: true,
					summary: true,
					specialization: true,
					timeForMentoring: true,
					openForQuestions: true,
					level: true,
					direction: { select: { id: true, name: true } },
				},
			},
		},
	});

	return json(expert);
});
