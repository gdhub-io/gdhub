import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Get, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiProjectsHandler {
	constructor() {}

	@Get()
	public async list() {
		return await prisma.project.findMany({
			where: {
				status: { in: [prismaClient.ProjectStatus.Approved, prismaClient.ProjectStatus.Done] },
			},
			include: {
				author: { select: { name: true } },
				workflow: {
					select: {
						id: true,
						title: true,
						steps: { where: { isCurrent: true } },
					},
				},
			},
		})
	}
}

export default createHandler(ApiProjectsHandler)
