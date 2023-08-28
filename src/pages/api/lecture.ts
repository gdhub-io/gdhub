import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamSlugDto {
	@IsString()
	id?: string
}

@NextAuthGuard('user')
class ApiLectureHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { id }: ParamSlugDto) {
		if (!id) throw Error('No id')

		const lecture = await prisma.lecture.findFirst({
			where: { id },
		})

		if (!lecture) {
			throw new Error('Not found the lecture data')
		}

		return lecture
	}
}

export default createHandler(ApiLectureHandler)
