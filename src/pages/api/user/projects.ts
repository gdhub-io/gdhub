import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UserSeasonProjectsDto {
	@IsString()
	@IsOptional()
	seasonId?: string
	@IsEnum(prismaClient.ProjectStatus)
	@IsOptional()
	status?: prismaClient.ProjectStatus
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
			select: {
				id: true,
				name: true,
				slug: true,
				description: true,
				coverImage: true,
				stage: {
					select: {
						isCurrent: true,
						name: true,
						season: { select: { id: true, name: true } },
					},
				},
			},
		})

		return projects
	}
}

export default createHandler(ApiUsewrSeasonProjectsHandler)
