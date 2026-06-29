import { z } from "zod";
import {
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const VacancyQuerySchema = z.object({
	id: z.string(),
});

type VacancyQuery = z.infer<typeof VacancyQuerySchema>;

export const GET = withAuth({ mode: "any" })(
	withValidation(
		VacancyQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const { id } = body as VacancyQuery;
		const currentUser = user as SessionUser | undefined;

		const data = await prisma.teamVacancy.findFirst({
			where: { id },
			include: {
				promiseStep: true,
				team: {
					select: {
						id: true,
						project: {
							select: {
								id: true,
								name: true,
								slug: true,
								description: true,
								coverImage: true,
								videoLink: true,
								genre: true,
								setting: true,
								audition: true,
								platform: true,
								visualStyle: true,
								author: {
									select: {
										name: true,
										image: true,
										profile: { select: { name: true, motivation: true } },
										specialities: {
											select: {
												name: true,
												specialization: true,
												level: true,
											},
											orderBy: { level: "desc" },
											take: 1,
										},
									},
								},
								workflow: {
									select: { steps: { select: { id: true, name: true } } },
								},
							},
						},
					},
				},
				_count: { select: { applicants: true } },
			},
		});

		let teamMember = null;

		if (currentUser?.id) {
			teamMember = await prisma.teamMember.findFirst({
				where: { vacancyId: id, userId: currentUser.id },
			});
		}

		return json({ ...data, myTeamMemberId: teamMember?.id });
	}),
);
