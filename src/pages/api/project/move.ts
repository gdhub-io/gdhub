import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Body, Put, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ApiProjectMoveDto {
	@IsString()
	projectId: string
	@IsEnum(['next', 'previous'])
	direction: 'next' | 'previous'
	@IsString()
	@IsOptional()
	targetStepId?: string
}

@NextAuthGuard('user', [prismaClient.UserRole.Author])
class ApiProjectMoveHandler {
	@Put()
	public async move(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) { projectId, direction, targetStepId }: ApiProjectMoveDto
	) {
		let changedStep

		if (['next', 'previous'].includes(direction)) {
			const project = await prisma.project.findFirst({
				where: { id: projectId },
				select: {
					workflow: {
						include: {
							currentStep: {
								include: {
									equityPromises: {
										where: { isExecuted: false },
										include: { allocation: { include: { owner: true } } },
									},
								},
							},
							steps: { include: { tasks: true } },
						},
					},
				},
			})

			if (project) {
				const currentStep = project.workflow?.currentStep

				if (!currentStep) return

				if (direction == 'next') {
					changedStep = project.workflow?.steps.find(
						(step: { order: number }) => step.order === (currentStep?.order || 0) + 1
					)
				}

				if (direction == 'previous' && currentStep?.order > 0) {
					changedStep = project.workflow?.steps.find(
						(step: { order: number }) => step.order === (currentStep?.order || 0) - 1
					)
				}

				if (changedStep) {
					await prisma.projectWorkflow.update({
						where: { projectId },
						data: { currentStepId: changedStep.id },
					})

					// Transfer equity promises to allocations
					if (direction == 'next' && currentStep.equityPromises) {
						for (const promise of currentStep.equityPromises) {
							// Update allocation percentage
							await prisma.equityAllocation.update({
								where: { id: promise.allocation.id },
								data: { percentage: promise.allocation.percentage + promise.percentage },
							})

							// Mark promise as executed
							await prisma.equityPromise.update({
								where: { id: promise.id },
								data: { isExecuted: true, executedAt: new Date() },
							})

							await prisma.equityTransaction.create({
								data: {
									percentage: promise.percentage,
									reason: 'Realized equity promise from step ' + currentStep.name,
									transactionType: prismaClient.EquityTransactionType.Vesting,
									fromAllocation: { connect: { id: promise.allocation.id } },
									toAllocation: { connect: { id: promise.allocation.id } },
									promise: { connect: { id: promise.id } },
									createdBy: { connect: { id: req.user.id } },
								},
							})
						}
					}
				}
			}
		}

		if (targetStepId) {
			const step = await prisma.projectWorkflowStep.findFirst({
				where: { id: targetStepId },
			})

			if (step) {
				await prisma.projectWorkflow.update({
					where: { projectId },
					data: { currentStepId: step.id },
				})
			}
		}
	}
}

export default createHandler(ApiProjectMoveHandler)
