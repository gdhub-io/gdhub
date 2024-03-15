import { prisma } from '@/services/prisma'
import { ProjectStatus } from '@prisma/client'
import { Get, createHandler } from 'next-api-decorators'

class ApiFeaturedProjectsHandler {
	constructor() {}

	@Get()
	public async featuredProjects() {
		return await prisma.project.findMany({
			where: {
				status: { in: [ProjectStatus.Approved, ProjectStatus.Done] },
			},
			take: 3,
			orderBy: [{ updatedAt: 'desc' }],
			select: { name: true, coverImage: true, videoLink: true, genre: true, visualStyle: true, setting: true },
		})
	}
}

export default createHandler(ApiFeaturedProjectsHandler)
