import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Get, createHandler } from 'next-api-decorators'

class ApiLatestProjectsHandler {
	constructor() {}

	@Get()
	public async list() {
		const projects = await prisma.project.findMany({
			where: {
				status: prismaClient.ProjectStatus.Approved,
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
			orderBy: { updatedAt: 'desc' },
			take: 5,
		})

		return projects
	}
}

export default createHandler(ApiLatestProjectsHandler)
