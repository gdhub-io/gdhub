import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class UserProjectTeamDto {
	@IsString()
	teamId: string
}

class ApiUserProjectTeamHandler {
	@Get()
	public async get(@Query(ValidationPipe) { teamId }: UserProjectTeamDto) {
		const team = await prisma.projectTeam.findFirst({
			where: { id: teamId },
			include: { members: { include: { user: { select: { name: true, image: true } } } } },
		})

		return team
	}
}

export default createHandler(ApiUserProjectTeamHandler)
