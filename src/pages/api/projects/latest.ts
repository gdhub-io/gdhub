import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createHandler, Get } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class ApiLatestProjectsHandler {
	constructor() {}

	@Get()
	public async list() {
		const projects = await prisma.project.findMany({
			where: {
				status: prismaClient.ProjectStatus.Approved,
				coverImage: { not: null },
				workflow: { currentStep: { order: { gt: 1 } } },
			},
			select: {
				id: true,
				name: true,
				slug: true,
				coverImage: true,
				genre: true,
				platform: true,
				updatedAt: true,
			},
			orderBy: { updatedAt: "desc" },
			take: 5,
		});

		return projects;
	}
}

export default createHandler(ApiLatestProjectsHandler);
