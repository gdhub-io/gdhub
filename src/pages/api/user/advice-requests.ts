import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsOptional, IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class AdviceRequestQueryParams {
	@IsString()
	@IsOptional()
	teamId: string

	@IsString()
	@IsOptional()
	projectId: string

	@IsString()
	@IsOptional()
	advisorId: string
}

@NextAuthGuard('user')
class ApiAdviceRequestsHandler {
	constructor() {}

	@Get()
	public async list(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { teamId, projectId, advisorId }: AdviceRequestQueryParams
	) {
		const adviceRequests = await prisma.adviceRequest.findMany({
			where: { project: { teamId, id: projectId }, toUser: { id: advisorId } },
			select: {
				fromUser: { select: { id: true, image: true, profile: { select: { name: true } } } },
				toUser: { select: { id: true, image: true, profile: { select: { name: true } } } },
				createdAt: true,
				status: true,
				id: true,
				comment: true,
				feedback: true,
				topic: true,
			},
			orderBy: { createdAt: 'desc' },
		})

		return adviceRequests
	}
}

export default createHandler(ApiAdviceRequestsHandler)
