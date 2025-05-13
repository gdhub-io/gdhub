import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
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

	@IsEnum(prismaClient.AdviceRequestStatus)
	@IsOptional()
	status: prismaClient.AdviceRequestStatus
}

@NextAuthGuard('user')
class ApiAdviceRequestsHandler {
	constructor() {}

	@Get()
	public async list(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { teamId, projectId, advisorId, status }: AdviceRequestQueryParams
	) {
		const adviceRequests = await prisma.adviceRequest.findMany({
			where: { project: { teamId, id: projectId }, toUser: { id: advisorId }, status },
			select: {
				fromUser: { select: { id: true, image: true, profile: { select: { name: true } } } },
				toUser: { select: { id: true, image: true, profile: { select: { name: true } } } },
				createdAt: true,
				finishedAt: true,
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
