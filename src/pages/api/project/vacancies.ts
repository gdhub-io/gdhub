import { IsString } from "class-validator";
import { createHandler, Get, Query, ValidationPipe } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class ProjectVacancyParams {
	@IsString()
	teamId: string;
}

class ApiProjectVacancyHandler {
	constructor() {}

	@Get()
	public async list(@Query(ValidationPipe) { teamId }: ProjectVacancyParams) {
		const vacancies = await prisma.teamVacancy.findMany({
			where: { status: "Published", teamId },
			include: {
				direction: { select: { name: true } },
				team: { select: { project: { select: { name: true } } } },
			},
			orderBy: { publishedAt: "desc" },
		});

		return vacancies;
	}
}

export default createHandler(ApiProjectVacancyHandler);
