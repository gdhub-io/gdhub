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
		const team = await prisma.project.findUnique({
			where: { id: projectId },
			select: {
				id: true,
				stage: { include: { season: { include: { stages: true } } } },
			},
		})

		return team
	}
}

export default createHandler(ApiUserProjectWorkflowHandler)
