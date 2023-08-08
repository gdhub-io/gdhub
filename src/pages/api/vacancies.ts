import { prisma } from '@/services/prisma'
import { Get, createHandler } from 'next-api-decorators'

class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async list() {
		const vacancies = await prisma.teamVacancy.findMany({
			where: { status: 'Published' },
			orderBy: { publishedAt: 'desc' },
		})

		return {
			total: vacancies.length,
			data: vacancies,
		}
	}
}

export default createHandler(ApiSpecialistHandler)
