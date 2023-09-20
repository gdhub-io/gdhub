import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamIdDto {
	@IsString()
	id: string
}

@NextAuthGuard('user')
class ApiUserTeamCandidateHandler {
	@Get()
	public async get(@Query(ValidationPipe) { id }: ParamIdDto) {
		const team = await prisma.teamMember.findFirst({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						image: true,
						profile: { include: { preferredGenres: true, preferredLevels: true, preferredSettings: true } },
					},
				},
				vacancy: true,
				speciality: true,
			},
		})

		return team
	}
}

export default createHandler(ApiUserTeamCandidateHandler)
