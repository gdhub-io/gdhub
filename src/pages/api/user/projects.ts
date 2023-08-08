import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { ProjectStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UserSeasonProjectsDto {
	@IsString()
	@IsOptional()
	seasonId?: string
	@IsEnum(ProjectStatus)
	@IsOptional()
	status?: ProjectStatus
}

@NextAuthGuard('user')
class ApiUsewrSeasonProjectsHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { seasonId, status }: UserSeasonProjectsDto
	) {
		const projects = await prisma.project.findMany({
			where: {
				authorId: req.user.id,
				status: status ? { equals: status } : undefined,
				stage: seasonId ? { seasonId: { equals: seasonId } } : undefined,
			},
		})

		return projects
	}
}

export default createHandler(ApiUsewrSeasonProjectsHandler)
