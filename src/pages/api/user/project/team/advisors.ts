import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamIdDto {
	@IsString()
	teamId: string
}

@NextAuthGuard('user')
class ApiTeamAdvisorHandler {
	@Get()
	public async get(@Query(ValidationPipe) { teamId }: ParamIdDto) {
		const team = await prisma.team.findUnique({
			where: { id: teamId },
			select: {
				project: {
					select: {
						id: true,
					},
				},
			},
		})

		const teamAdvisors = await prisma.user.findMany({
			where: {
				adviceRequestsForMe: {
					some: {
						projectId: team?.project?.id,
					},
				},
			},
			include: {
				_count: {
					select: {
						adviceRequestsForMe: {
							where: {
								status: prismaClient.AdviceRequestStatus.Approved,
							},
						},
					},
				},
				profile: {
					select: {
						name: true,
					},
				},
				specialities: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		})

		return teamAdvisors
	}
}

export default createHandler(ApiTeamAdvisorHandler)
