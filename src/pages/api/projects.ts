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
				where: stage
					? {
							workflow: {
								is: {
									currentStep: {
										is: {
											name: stage,
										},
									},
								},
							},
						}
					: undefined,
			});
			const projectIds = projects.map((project) => project.id);
			const publishedVacancies = await prisma.teamVacancy.findMany({
				where: {
					team: {
						project: {
							id: {
								in: projectIds,
							},
						},
					},
					status: "Published",
				},
				select: {
					team: {
						select: {
							project: {
								select: {
									id: true,
								},
							},
						},
					},
				},
			});
			const projectIdsWithOpenPositions = new Set(
				publishedVacancies.flatMap((vacancy) =>
					vacancy.team.project?.id ? [vacancy.team.project.id] : [],
				),
			);

			return await Promise.all(
				projects.map(async (project) => ({
					...project,
					applauseCount: await prisma.project.getApplauseCount({
						projectId: project.id,
					}),
					hasOpenPositions: projectIdsWithOpenPositions.has(project.id),
				})),
			);
		} catch (error) {
			console.error("[projects: list: error]", error);
			throw new BadRequestException("Failed to get projects");
		}
	}
}

export default createHandler(ApiProjectsHandler);
