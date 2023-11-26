import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UserTeamDto {
	@IsString()
	teamId: string
}

@NextAuthGuard('user')
class ApiUserProjectVacanciesHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { teamId }: UserTeamDto) {
		const vacancies = await prisma.teamVacancy.findMany({
			where: { teamId, status: { not: 'Closed' } },
		})

		return vacancies
	}
}

export default createHandler(ApiUserProjectVacanciesHandler)
