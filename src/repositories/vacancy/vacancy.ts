import { fromCents } from "@/helpers/format";
import { prisma } from "@/services/prisma";

/**
 * A vacancy as its public page shows it — the same for every viewer — or
 * `null` when there is none.
 */
export async function findPublicVacancy(id: string) {
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

	if (!data) return null;

	return {
		...data,
		offeredAmount: fromCents(data.offeredAmount),
	};
}
