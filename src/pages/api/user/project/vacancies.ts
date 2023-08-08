// import AirtableService from '@/services/airtable'
// import { NextApiRequest, NextApiResponse } from 'next'
// import { getServerSession } from 'next-auth'
// import { authOptions } from '../auth/[...nextauth]'

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
// 	try {
// 		const { projectId, projectName } = req.body
// 		const session: any = await getServerSession(req, res, authOptions)

// 		if (req.method !== 'POST' || !session || !projectId) throw new Error('Forbidden request')

// 		const vacancies = await AirtableService('Project Vacancies')
// 			.select({
// 				filterByFormula: `AND(Status != "Closed", FIND("${projectName}", {Project}))`,
// 			})
// 			.all()

// 		res.json({
// 			total: vacancies ? vacancies.length : 0,
// 			data: vacancies.map((vacancy: any) => ({
// 				id: vacancy.id,
// 				...vacancy.fields,
// 			})),
// 		})
// 	} catch (error: any) {
// 		res.json({ success: false, error: error.message })
// 	}
// }

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
