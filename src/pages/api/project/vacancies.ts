import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class ProjectVacancyParams {
	@IsString()
	teamId: string
}

class ApiProjectVacancyHandler {
	constructor() {}

	@Get()
	public async list(@Query(ValidationPipe) { teamId }: ProjectVacancyParams) {
		const vacancies = await prisma.teamVacancy.findMany({
			where: { status: 'Published', teamId },
			include: { direction: { select: { name: true } }, project: { select: { name: true } } },
			orderBy: { publishedAt: 'desc' },
		})

		return vacancies
	}
}

export default createHandler(ApiProjectVacancyHandler)
