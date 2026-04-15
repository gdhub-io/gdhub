import { IsOptional, IsString } from "class-validator";
import {
	BadRequestException,
	createHandler,
	Get,
	Query,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class ProjectsQueryDto {
	@IsOptional()
	@IsString()
	stage?: string;
}

@NextAuthGuard("user")
class ApiProjectsHandler {
	constructor() {}

	@Get()
	public async list(@Query(ValidationPipe) { stage }: ProjectsQueryDto) {
		try {
			const projects = await prisma.project.getProjectsOrderedByActivity({
				order: "desc",
			});
			const teamIds = projects.map((project) => project.teamId);
			const publishedVacancies = await prisma.teamVacancy.findMany({
				where: {
					teamId: {
						in: teamIds,
					},
					status: "Published",
				},
				select: {
					teamId: true,
				},
			});
			const teamIdsWithOpenPositions = new Set(
				publishedVacancies.map((vacancy) => vacancy.teamId),
			);

			const filteredProjects = stage
				? projects.filter(
						(project) => project.workflow?.currentStep?.name === stage,
					)
				: projects;

			return await Promise.all(
				filteredProjects.map(async (project) => ({
					...project,
					applauseCount: await prisma.project.getApplauseCount({
						projectId: project.id,
					}),
					hasOpenPositions: teamIdsWithOpenPositions.has(project.teamId),
				})),
			);
		} catch (error) {
			console.error("[projects: list: error]", error);
			throw new BadRequestException("Failed to get projects");
		}
	}
}

export default createHandler(ApiProjectsHandler);
