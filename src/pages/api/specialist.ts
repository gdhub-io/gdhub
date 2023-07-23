import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamIdDto {
	@IsString()
	id: string
}

@NextAuthGuard('user')
class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { id }: ParamIdDto) {
		const specialist = await prisma.speciality.findFirst({
			where: { id },
			include: {
				user: {
					select: {
						name: true,
						image: true,
						email: true,
						profile: { include: { preferredGenres: true, preferredLevels: true, preferredSettings: true } },
					},
				},
				direction: true,
			},
		})

		return specialist
	}
}

export default createHandler(ApiSpecialistHandler)
