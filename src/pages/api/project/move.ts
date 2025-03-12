import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Body, Put, ValidationPipe, createHandler } from 'next-api-decorators'

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
	public async move(@Body(ValidationPipe) { projectId, direction, targetStepId }: ApiProjectMoveDto) {
		let changedStep

		if (['next', 'previous'].includes(direction)) {
			const project = await prisma.project.findFirst({
				where: { id: projectId },
				select: { workflow: { include: { currentStep: true, steps: { include: { tasks: true } } } } },
			})

			if (project) {
				const currentStep = project.workflow?.currentStep

				if (!currentStep) return

				if (direction == 'next') {
					changedStep = project.workflow?.steps.find((step) => step.order === (currentStep?.order || 0) + 1)
				}

				if (direction == 'previous' && currentStep?.order > 0) {
					changedStep = project.workflow?.steps.find((step) => step.order === (currentStep?.order || 0) - 1)
				}

				if (changedStep) {
					await prisma.projectWorkflow.update({
						where: { projectId },
						data: { currentStepId: changedStep.id },
					})
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
