import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class GetProjectDto {
	@IsString()
	projectId: string
}

@NextAuthGuard('user')
class ApiProjectHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { projectId }: GetProjectDto) {
		const project = await prisma.project.findFirst({
			where: { id: projectId },
			include: { author: { select: { id: true, name: true, image: true } }, workflow: { select: { steps: true } } },
		})

		return project
	}
}

export default createHandler(ApiProjectHandler)
