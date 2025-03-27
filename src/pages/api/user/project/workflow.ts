import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UserProjectWorkflowDto {
	@IsString()
	projectId: string
}

@NextAuthGuard('user')
class ApiUserProjectWorkflowHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { projectId }: UserProjectWorkflowDto) {
		const projectAuthor = await prisma.teamMember.count({
			where: {
				userId: req.user.id,
				team: {
					project: {
						id: projectId,
					},
				},
				status: prismaClient.TeamMemberStatus.Founder,
			},
		})

		const projectWorkflow = await prisma.projectWorkflow.findFirst({
			where: { projectId },
			include: {
				currentStep: {
					include: {
						tasks: true,
						equityPromises: projectAuthor
							? {
									where: { isExecuted: false },
									select: {
										id: true,
										percentage: true,
										allocation: { select: { id: true, percentage: true, owner: { select: { id: true, name: true } } } },
									},
								}
							: undefined,
					},
				},
				steps: { select: { id: true, order: true, name: true }, orderBy: { order: 'asc' } },
			},
		})

		return projectWorkflow
	}
}

export default createHandler(ApiUserProjectWorkflowHandler)
