import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { ProjectStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class SeasonProjectsDto {
	@IsString()
	seasonId: string
	@IsEnum(ProjectStatus)
	@IsOptional()
	status?: ProjectStatus
	@IsString()
	@IsOptional()
	userId?: string
}

@NextAuthGuard('user')
class ApiSeasonProjectsHandler {
	@Get()
	public async get(@Query(ValidationPipe) { seasonId, userId, status = 'Approved' }: SeasonProjectsDto) {
		const projects = await prisma.project.findMany({
			where: { id: seasonId, authorId: userId, status: { equals: status } },
			include: { author: { select: { image: true, name: true, id: true } } },
		})

		return projects
	}
}

export default createHandler(ApiSeasonProjectsHandler)
