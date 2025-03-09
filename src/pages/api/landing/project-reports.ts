import { prisma } from '@/services/prisma'
import { createHandler, Get } from 'next-api-decorators'

class ApiDevlogsRecentHandler {
	constructor() {}

	@Get()
	public async list() {
		const recentDevlogs = await prisma.projectReport.findMany({
			take: 6,
			orderBy: {
				publishedAt: 'desc',
			},
			where: {
				project: {
					status: 'Approved',
				},
			},
			include: {
				author: {
					select: {
						name: true,
						image: true,
					},
				},
				project: {
					select: {
						name: true,
						slug: true,
						description: true,
					},
				},
			},
		})

		return recentDevlogs
	}
}

export default createHandler(ApiDevlogsRecentHandler)
