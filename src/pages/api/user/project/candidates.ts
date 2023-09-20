import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { TeamMemberStatus } from '@prisma/client'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UserTeamCandidatesDto {
	@IsString()
	teamId: string
}

@NextAuthGuard('user')
class ApiTeamCandidatesHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { teamId }: UserTeamCandidatesDto) {
		const applicants = await prisma.teamMember.findMany({
			where: { teamId, status: { equals: TeamMemberStatus.Applicant } },
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true,
						image: true,
						specialities: { select: { id: true, name: true } },
						profile: { include: { preferredGenres: true, preferredLevels: true, preferredSettings: true } },
					},
				},
				vacancy: true,
				speciality: true,
			},
		})

		return applicants
	}
}

export default createHandler(ApiTeamCandidatesHandler)
