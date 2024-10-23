import { prisma } from '@/services/prisma'
import { Get, createHandler } from 'next-api-decorators'

class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async list() {
		const vacancies = await prisma.teamVacancy.findMany({
			where: { status: 'Published' },
			orderBy: { publishedAt: 'desc' },
			include: {
				team: { select: { project: { select: { id: true, name: true, description: true, slug: true } } } },
				direction: { select: { id: true, name: true } },
			},
		})

		return vacancies
	}
}

export default createHandler(ApiSpecialistHandler)
