import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Get, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiSeasonsHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser) {
		let output: any[] = []

		const seasons = await prisma.season.findMany({
			where: { status: { in: ['Active', 'Planning'] }, name: { not: 'Indie' } },
			select: {
				name: true,
				coverImage: true,
				stages: {
					select: {
						id: true,
						isCurrent: true,
						startedAt: true,
						finishedAt: true,
						name: true,
						order: true,
						description: true,
						projects: {
							where: { status: { in: ['Approved', 'Done'] } },
							select: { team: { select: { members: true } } },
						},
					},
				},
				startedAt: true,
				slug: true,
			},
			orderBy: [{ startedAt: 'desc' }],
		})

		if (!seasons) {
			return []
		}

		for (const season of seasons) {
			const { name, slug, startedAt, stages, coverImage } = season
			const currentStage = stages.find((stage) => stage.isCurrent)
			const projectsCount = stages.reduce((result, stage) => result + stage.projects.length, 0)
			const membersCount = stages.reduce(
				(result, stage) =>
					result + stage.projects.reduce((res, project) => res + (project.team?.members.length || 0), 0),
				0
			)
			const _output: Record<string, any> = {
				name,
				slug,
				startedAt,
				currentStage,
				projectsCount,
				membersCount,
				coverImage,
			}

			output.push(_output)
		}

		return output
	}
}

export default createHandler(ApiSeasonsHandler)
