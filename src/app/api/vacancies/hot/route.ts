import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async () => {
	const now = new Date();

	const vacancies = await prisma.teamVacancy.findMany({
		where: {
			status: "Published",
			finishedAt: { gt: now },
		},
		orderBy: { finishedAt: "asc" },
		take: 5,
		select: {
			id: true,
			title: true,
			finishedAt: true,
			team: {
				select: {
					project: {
						select: {
							name: true,
							slug: true,
							coverImage: true,
						},
					},
				},
			},
		},
	});

	const result = vacancies.map((v) => ({
		id: v.id,
		title: v.title,
		finishedAt: v.finishedAt?.toISOString?.() ?? String(v.finishedAt),
		project: {
			name: v.team?.project?.name ?? "",
			slug: v.team?.project?.slug ?? "",
			coverImage: v.team?.project?.coverImage ?? null,
		},
	}));

	return json(result);
});
