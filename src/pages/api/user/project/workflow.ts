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
				currentStep: { include: { tasks: true } },
				steps: { select: { id: true, order: true, name: true }, orderBy: { order: 'asc' } },
			},
		})

		return projectWorkflow
	}
}

export default createHandler(ApiUserProjectWorkflowHandler)
