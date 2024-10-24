import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsOptional, IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamDto {
	@IsString()
	@IsOptional()
	stage?: string
}

@NextAuthGuard('user')
class ApiLecturesHandler {
	constructor() {}

	@Get()
	public async list(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { stage }: ParamDto) {
		const stages = stage?.split(',') as prismaClient.LectureStage[]

		const lectures = await prisma.lecture.findMany({
			where: { stage: stages ? { in: stages } : undefined },
			include: {
				lecturerRequests: { include: { user: true } },
				direction: true,
				listeners: { select: { userId: true } },
			},
			orderBy: [{ date: { sort: 'desc' } }, { listeners: { _count: 'desc' } }],
		})

		const lecturesWithRelevant = lectures.map((lecture) => {
			let isRelevant = false

			if (lecture.listeners.find((r) => r.userId == req.user.id)) {
				isRelevant = true
			}

			return {
				...lecture,
				isRelevant,
				isAuthor: lecture.requestedById === req.user.id,
			}
		})

		return lecturesWithRelevant
	}
}

export default createHandler(ApiLecturesHandler)
