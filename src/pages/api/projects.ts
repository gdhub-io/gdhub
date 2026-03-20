import { BadRequestException, createHandler, Get } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user")
class ApiProjectsHandler {
	constructor() {}

	@Get()
	public async list() {
		try {
			const projects = await prisma.project.getProjectsOrderedByActivity({
				order: "desc",
			});

			return await Promise.all(
				projects.map(async (project) => ({
					...project,
					applauseCount: await prisma.project.getApplauseCount({
						projectId: project.id,
					}),
				})),
			);
		} catch (error) {
			console.error("[projects: list: error]", error);
			throw new BadRequestException("Failed to get projects");
		}
	}
}

export default createHandler(ApiProjectsHandler);
