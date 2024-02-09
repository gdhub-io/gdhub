import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { ProjectStatus } from '@prisma/client'
import { Get, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiProjectsHandler {
	constructor() {}

	@Get()
	public async list() {
		return await prisma.project.findMany({
			where: {
				status: { in: [ProjectStatus.Approved, ProjectStatus.Done] },
			},
			include: {
				stage: { select: { id: true, name: true, season: { select: { id: true, name: true } } } },
				author: { select: { name: true } },
			},
		})
	}
}

export default createHandler(ApiProjectsHandler)
