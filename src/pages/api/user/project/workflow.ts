import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class UserProjectWorkflowDto {
	@IsString()
	projectId: string
}

@NextAuthGuard('user')
class ApiUserProjectWorkflowHandler {
	@Get()
	public async get(@Query(ValidationPipe) { projectId }: UserProjectWorkflowDto) {
		const projectWorkflow = await prisma.projectWorkflow.findFirst({
			where: { projectId },
			include: {
				steps: { orderBy: { order: 'asc' }, include: { tasks: true } },
			},
		})

		const currentStep = await prisma.project.getCurrentWorkflowStep({
			projectId,
		})

		return {
			currentStep: currentStep,
			workflow: projectWorkflow,
		}
	}
}

export default createHandler(ApiUserProjectWorkflowHandler)
