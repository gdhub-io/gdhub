import { json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const vacancies = await prisma.teamVacancy.findMany({
		where: { status: "Published", finishedAt: { gt: new Date() } },
		orderBy: { publishedAt: "desc" },
		include: {
			team: {
				select: {
					project: {
						select: {
							id: true,
							name: true,
							description: true,
							slug: true,
							coverImage: true,
						},
					},
				},
			},
			direction: { select: { id: true, name: true } },
		},
	});

	return json(vacancies);
}
