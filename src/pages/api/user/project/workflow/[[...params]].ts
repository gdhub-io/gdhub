import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Type } from 'class-transformer'
import { IsDate, IsOptional, IsString, ValidateIf } from 'class-validator'
import { Body, Get, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UserProjectWorkflowDto {
	@IsString()
	projectId: string
}

class UpdateStepDto {
	@IsString()
	id: string

	@IsDate()
	@Type(() => Date)
	@ValidateIf((object, value) => {
		console.log('ValidateIf', object, value)
		return value !== null
	})
	plannedAt: Date | null
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
				steps: {
					select: { id: true, order: true, name: true, plannedAt: true, finishedAt: true },
					orderBy: { order: 'asc' },
				},
			},
		})

		return projectWorkflow
	}

	@Put('/step')
	public async updateStep(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) { id, plannedAt }: UpdateStepDto) {
		await prisma.projectWorkflowStep.update({
			where: { id },
			data: { plannedAt: plannedAt || null },
		})
	}
}

export default createHandler(ApiUserProjectWorkflowHandler)
