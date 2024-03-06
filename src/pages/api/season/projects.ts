import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { ProjectStatus } from '@prisma/client'
import { IsOptional, IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class SeasonProjectsDto {
	@IsString()
	@IsOptional()
	seasonId?: string

	@IsString()
	@IsOptional()
	seasonSlug?: string
}

@NextAuthGuard('user')
class ApiSeasonProjectsHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { seasonId, seasonSlug }: SeasonProjectsDto
	) {
		const aiProjects = await prisma.project.findMany({
			where: { status: { in: [ProjectStatus.Approved] } },
			include: {
				availableSpecialists: { where: { avgScore: { gte: 75 } }, select: { avgScore: true } },
				author: { select: { image: true, name: true, id: true } },
			},
			take: 8,
			orderBy: [{ availableSpecialists: { _count: 'desc' } }, { updatedAt: 'desc' }],
		})

		return aiProjects
	}
}

export default createHandler(ApiSeasonProjectsHandler)
