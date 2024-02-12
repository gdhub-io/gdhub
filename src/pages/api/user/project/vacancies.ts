import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { TeamVacancyStatus } from '@prisma/client'
import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UserTeamDto {
	@IsString()
	teamId: string

	@IsBoolean()
	@IsOptional()
	isArchive?: boolean
}

@NextAuthGuard('user')
class ApiUserProjectVacanciesHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { teamId, isArchive = false }: UserTeamDto
	) {
		const vacancies = await prisma.teamVacancy.findMany({
			where: { teamId, status: isArchive ? { equals: TeamVacancyStatus.Closed } : { not: TeamVacancyStatus.Closed } },
		})

		return vacancies
	}
}

export default createHandler(ApiUserProjectVacanciesHandler)
