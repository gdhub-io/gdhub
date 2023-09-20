import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UserProjectTeamDto {
	@IsString()
	teamId: string
}

@NextAuthGuard('user')
class ApiUserProjectVacanciesHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { teamId }: UserProjectTeamDto) {
		const vacancies = await prisma.teamVacancy.findMany({
			where: { teamId, status: { not: 'Closed' } },
		})

		return vacancies
	}
}

export default createHandler(ApiUserProjectVacanciesHandler)
