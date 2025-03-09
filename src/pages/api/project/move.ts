import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsString } from 'class-validator'
import { Body, Put, ValidationPipe, createHandler } from 'next-api-decorators'

class ApiProjectMoveDto {
	@IsString()
	projectId: string
	@IsString()
	targetStageId: string
}

@NextAuthGuard('user', [prismaClient.UserRole.Author])
class ApiProjectMoveHandler {
	@Put()
	public async move(@Body(ValidationPipe) { projectId, targetStageId }: ApiProjectMoveDto) {
		let nextStep

		if (['next', 'previous'].includes(targetStageId)) {
			const project = await prisma.project.findFirst({
				where: { id: projectId },
				select: { workflow: { include: { steps: { include: { tasks: true } } } } },
			})

			if (project) {
				const currentStep = project.workflow?.steps.find((step) => step.isCurrent)

				if (!currentStep) return

				if (targetStageId == 'next') {
					nextStep = project.workflow?.steps.find((step) => step.order === (currentStep?.order || 0) + 1)
				}

				if (targetStageId == 'previous' && currentStep?.order > 0) {
					nextStep = project.workflow?.steps.find((step) => step.order === (currentStep?.order || 0) - 1)
				}

				if (nextStep) {
					await prisma.projectWorkflowStep.update({
						where: { id: currentStep.id },
						data: { isCurrent: false },
					})

					await prisma.projectWorkflowStep.update({
						where: { id: nextStep?.id },
						data: { isCurrent: true },
					})
				}
			}
		}
	}
}

export default createHandler(ApiProjectMoveHandler)
