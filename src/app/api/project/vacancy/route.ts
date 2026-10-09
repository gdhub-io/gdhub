import { z } from "zod";
import {
	apiError,
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
				// Drives the colour and icon of the share card, the same way it drives
				// VacancyCard on the jobs board.
				direction: { select: { name: true } },
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

		// Spreading a missing record would answer `200 {}`, which reads as a hit to
		// every caller — the job page then rendered instead of returning a 404.
		if (!data) return apiError.notFound("Vacancy not found");

		let teamMember = null;

		if (currentUser?.id) {
			teamMember = await prisma.teamMember.findFirst({
				where: { vacancyId: id, userId: currentUser.id },
				// A second application to the same vacancy is the one that counts.
				orderBy: { createdAt: "desc" },
			});
		}

		// `offeredAmount` is stored in minor units (cents) to match the Payment
		// money convention, and every consumer of this endpoint renders it as
		// euros. Converting here rather than at each call site: the write path in
		// /api/user/project/vacancy already does the mirror image of this, and the
		// job page was printing cents with a € in front of them.
		return json({
			...data,
			offeredAmount:
				data.offeredAmount != null ? data.offeredAmount / 100 : null,
			myTeamMemberId: teamMember?.id,
		});
	}),
);
