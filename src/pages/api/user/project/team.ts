import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { TeamMemberStatus } from '@prisma/client'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class UserTeamDto {
	@IsString()
	teamId: string
}

@NextAuthGuard('user')
class ApiUserTeamHandler {
	@Get()
	public async get(@Query(ValidationPipe) { teamId }: UserTeamDto) {
		const team = await prisma.team.findUnique({
			where: { id: teamId },
			include: {
				members: {
					where: {
						status: { in: [TeamMemberStatus.Founder, TeamMemberStatus.Hired, TeamMemberStatus.Fired] },
					},
					include: { user: { select: { name: true, image: true } } },
				},
			},
		})

		return team
	}
}

export default createHandler(ApiUserTeamHandler)
