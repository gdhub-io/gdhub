import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamSlugDto {
	@IsString()
	slug: string

	@IsBoolean()
	@IsOptional()
	withProjects: boolean
}

@NextAuthGuard('user')
class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { slug, withProjects }: ParamSlugDto) {
		const season = await prisma.season.findFirst({
			where: { slug },
			include: { stages: { include: { projects: withProjects } } },
		})

		if (!season) {
			throw new Error('Not found the season data')
		}

		return season
	}
}

export default createHandler(ApiSpecialistHandler)
