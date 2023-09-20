import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { TeamMemberStatus } from '@prisma/client'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class UserProjectTeamDto {
	@IsString()
	teamId: string
}

@NextAuthGuard('user')
class ApiUserProjectTeamHandler {
	@Get()
	public async get(@Query(ValidationPipe) { teamId }: UserProjectTeamDto) {
		const team = await prisma.projectTeam.findFirst({
			where: {
				id: teamId,
				members: {
					some: { status: { in: [TeamMemberStatus.Founder, TeamMemberStatus.Hired, TeamMemberStatus.Fired] } },
				},
			},
			include: { members: { include: { user: { select: { name: true, image: true } } } } },
		})

		return team
	}
}

export default createHandler(ApiUserProjectTeamHandler)
