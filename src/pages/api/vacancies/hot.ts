import { createHandler, Get } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user")
class ApiHotVacanciesHandler {
	@Get()
	public async list() {
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

		return vacancies.map((v) => ({
			id: v.id,
			title: v.title,
			finishedAt: v.finishedAt?.toISOString?.() ?? String(v.finishedAt),
			project: {
				name: v.team?.project?.name ?? "",
				slug: v.team?.project?.slug ?? "",
				coverImage: v.team?.project?.coverImage ?? null,
			},
		}));
	}
}

export default createHandler(ApiHotVacanciesHandler);
