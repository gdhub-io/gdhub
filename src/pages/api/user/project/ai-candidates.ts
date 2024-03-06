import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UserRole } from '@prisma/client'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UserTeamCandidatesDto {
	@IsString()
	projectId: string
}

@NextAuthGuard('user')
class ApiTeamAICandidatesHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { projectId }: UserTeamCandidatesDto) {
		if (!req.user.id) return

		const isAdmin = req.user.roles?.includes(UserRole.Admin)
		const hasActiveSubscription = await prisma.user.activeSubscription(req.user.id)

		if (!hasActiveSubscription && !isAdmin) return

		const specialists = await prisma.matchingSpecialistAndProject.findMany({
			where: {
				projectId,
				avgScore: { gte: 75 },
				specialist: { user: { memberInTeams: { none: {} }, profile: { isActive: true } } },
			},
			include: { specialist: { include: { user: { select: { id: true, name: true, image: true } } } } },
			orderBy: { avgScore: 'desc' },
		})

		return specialists
	}
}

export default createHandler(ApiTeamAICandidatesHandler)
