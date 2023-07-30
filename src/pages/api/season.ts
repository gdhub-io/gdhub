import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamSlugDto {
	@IsString()
	slug: string
}

@NextAuthGuard('user')
class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { slug }: ParamSlugDto) {
		const season = await prisma.season.findFirst({
			where: { slug },
			include: { stages: true },
		})

		if (!season) {
			throw new Error('Not found the season data')
		}

		return season
	}
}

export default createHandler(ApiSpecialistHandler)
