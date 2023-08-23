import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsOptional, IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

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
	public async get(@Query(ValidationPipe) { seasonId, seasonSlug }: SeasonProjectsDto) {
		if (seasonSlug) {
			const season = await prisma.season.findFirst({ where: { slug: seasonSlug }, select: { id: true } })
			seasonId = season?.id
		}

		const projects = await prisma.project.findMany({
			where: { stage: { seasonId } },
			include: { author: { select: { image: true, name: true, id: true } } },
		})

		return projects
	}
}

export default createHandler(ApiSeasonProjectsHandler)
