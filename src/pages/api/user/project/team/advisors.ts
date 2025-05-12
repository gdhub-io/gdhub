import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'
import { AdviceRequestStatus } from '../../../../../../node_modules/.prisma/client/index.d'

class ParamIdDto {
	@IsString()
	teamId: string
}

@NextAuthGuard('user')
class ApiTeamAdvisorHandler {
	@Get()
	public async get(@Query(ValidationPipe) { teamId }: ParamIdDto) {
		// const team = await prisma.team.findUnique({
		// 	where: { id: teamId },
		// 	select: {
		// 		project: {
		// 			select: {
		// 				id: true,
		// 			},
		// 		},
		// 	},
		// })

		const teamAdvisors = await prisma.teamAdvisor.findMany({
			where: { teamId },
			include: {
				speciality: {
					select: {
						id: true,
						name: true,
					},
				},
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						profile: {
							include: {
								preferredGenres: true,
								preferredLevels: true,
								preferredSettings: true,
							},
						},
						// adviceRequestsForMe: { where: { status: AdviceRequestStatus.Approved, projectId: team?.project?.id } },
					},
				},
			},
		})

		return { teamAdvisors }
	}
}

export default createHandler(ApiTeamAdvisorHandler)
