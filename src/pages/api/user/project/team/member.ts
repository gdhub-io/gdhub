import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamIdDto {
	@IsString()
	id: string
}

@NextAuthGuard('user')
class ApiTeamMemberHandler {
	@Get()
	public async get(@Query(ValidationPipe) { id }: ParamIdDto) {
		const teamMember = await prisma.teamMember.findUnique({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						profile: {
							include: {
								preferredGenres: true,
								preferredLevels: true,
								preferredSettings: true,
							},
						},
					},
				},
				team: {
					select: {
						project: true,
					},
				},
				speciality: true,
			},
		})

		if (!teamMember) {
			throw new Error('Team member not found')
		}

		return teamMember
	}
}

export default createHandler(ApiTeamMemberHandler)
