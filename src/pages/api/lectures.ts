import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { LectureStage } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamDto {
	@IsEnum(LectureStage)
	@IsOptional()
	stage?: LectureStage
}

@NextAuthGuard('user')
class ApiLecturesHandler {
	constructor() {}

	@Get()
	public async list(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { stage }: ParamDto) {
		const lectures = await prisma.lecture.findMany({
			where: { stage },
			include: {
				lecturer: true,
				direction: true,
				listeners: { select: { id: true } },
			},
			orderBy: [{ date: { sort: 'desc' } }, { listeners: { _count: 'desc' } }],
		})

		const lecturesWithRelevant = lectures.map((lecture) => {
			let isRelevant = false

			if (req.user.id && lecture.listeners.includes({ id: req.user.id })) {
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
