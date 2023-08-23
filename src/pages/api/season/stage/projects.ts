import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { ProjectStatus } from '@prisma/client'
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class SeasonProjectsDto {
	@IsString()
	stageId: string

	@IsEnum(ProjectStatus)
	@IsOptional()
	status?: ProjectStatus

	@IsString()
	@IsOptional()
	userId?: string

	@IsBoolean()
	@IsOptional()
	onlyCount: boolean
}

@NextAuthGuard('user')
class ApiSeasonProjectsHandler {
	@Get()
	public async get(
		@Query(ValidationPipe) { stageId, status = ProjectStatus.Approved, onlyCount = false }: SeasonProjectsDto
	) {
		if (onlyCount) {
			const projectsCount = await prisma.project.count({
				where: { stageId, status: { equals: status } },
			})

			return { count: projectsCount }
		}

		const projects = await prisma.project.findMany({
			where: { stageId, status: { equals: status } },
			include: { author: { select: { image: true, name: true, id: true } } },
		})

		return projects
	}
}

export default createHandler(ApiSeasonProjectsHandler)
