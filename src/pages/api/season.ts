import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamSlugDto {
	@IsString()
	@IsOptional()
	slug?: string

	@IsString()
	@IsOptional()
	id?: string

	@IsBoolean()
	@IsOptional()
	withProjects: boolean
}

@NextAuthGuard('user')
class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { id, slug, withProjects }: ParamSlugDto
	) {
		if (!id && !slug) throw Error('No id or slug value')

		const season = await prisma.season.findFirst({
			where: { id, slug },
			include: { stages: { include: { projects: withProjects } } },
			orderBy: { stages: { _count: 'asc' } },
		})

		if (!season) {
			throw new Error('Not found the season data')
		}

		season.stages.sort((a, b) => a.order - b.order)

		return season
	}
}

export default createHandler(ApiSpecialistHandler)
