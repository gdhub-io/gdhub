import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UserProjectTeamDto {
	@IsString()
	teamId: string
}

@NextAuthGuard('user')
class ApiUserProjectTeamHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { teamId }: UserProjectTeamDto) {
		const team = await prisma.projectTeam.findFirst({
			where: { id: teamId },
			include: { members: { include: { user: { select: { name: true, image: true } } } } },
		})

		return team
	}
}

export default createHandler(ApiUserProjectTeamHandler)
