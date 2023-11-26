import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class UserTeamDto {
	@IsString()
	teamId: string
}

class ApiUserTeamHandler {
	@Get()
	public async get(@Query(ValidationPipe) { teamId }: UserTeamDto) {
		const team = await prisma.team.findFirst({
			where: { id: teamId },
			include: { members: { include: { user: { select: { name: true, image: true } } } } },
		})

		return team
	}
}

export default createHandler(ApiUserTeamHandler)
