import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class ApiProjecReportsParams {
	@IsString()
	projectId: string
}

class ApiProjecReportsHandler {
	constructor() {}

	@Get()
	public async list(@Query(ValidationPipe) { projectId }: ApiProjecReportsParams) {
		const reports = await prisma.projectReport.findMany({
			where: { projectId },
			orderBy: { publishedAt: 'desc' },
			take: 5,
			include: {
				author: {
					select: {
						name: true,
						image: true,
						memberInTeams: {
							where: {
								team: {
									project: {
										id: projectId,
									},
								},
							},
							select: { position: true },
						},
						profile: {
							select: { name: true },
						},
					},
				},
			},
		})

		return reports
	}
}

export default createHandler(ApiProjecReportsHandler)
