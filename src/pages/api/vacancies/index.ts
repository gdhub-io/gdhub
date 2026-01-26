import { createHandler, Get } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class ApiSpecialistHandler {
	@Get()
	public async list() {
		const vacancies = await prisma.teamVacancy.findMany({
			where: { status: "Published" },
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

		return vacancies;
	}
}

export default createHandler(ApiSpecialistHandler);
