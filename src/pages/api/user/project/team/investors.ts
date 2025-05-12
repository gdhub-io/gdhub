import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamIdDto {
	@IsString()
	teamId: string
}

@NextAuthGuard('user')
class ApiTeamInvestorHandler {
	@Get()
	public async get(@Query(ValidationPipe) { teamId }: ParamIdDto) {
		const teamInvestors = await prisma.teamInvestor.findMany({
			where: { teamId },
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
			},
		})

		return teamInvestors
	}
}

export default createHandler(ApiTeamInvestorHandler)
