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
			where: { status: 'Active', name: { not: 'Indie' } },
			select: {
				name: true,
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
		})

		// const seasons = await AirtableService('Seasons')
		// 	.select({
		// 		fields: ['Name', 'Season Stages', 'Started At', 'Slug', 'Project Ideas', 'Members', 'Approved Projects'],
		// 		sort: [{ field: 'Started At', direction: 'desc' }],
		// 		filterByFormula: 'Status != "Not Active"',
		// 	})
		// 	.all()

		if (!seasons) {
			return []
		}

		for (const season of seasons) {
			const { name, slug, startedAt, stages } = season
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
			}
			// 	const approvedProjectsIds = season.get('Approved Projects') as string[]
			// 	const _output: Record<string, any> = {
			// 		...season.fields,
			// 		id: season.id,
			// 		membersCount: approvedProjectsIds ? approvedProjectsIds.length : 0,
			// 		projectsCount: approvedProjectsIds?.length || 0,
			// 	}
			// 	const stagesList = season.get('Season Stages') as string[]
			// 	const stages = await AirtableService('Season Stages')
			// 		.select({
			// 			sort: [{ field: 'Order', direction: 'asc' }],
			// 			fields: ['Name', 'Started At', 'Finished At', 'Status'],
			// 			filterByFormula: `FIND(RECORD_ID(), "${stagesList.join(' ')}")`,
			// 		})
			// 		.all()
			// 	if (stages) {
			// 		_output['Season Stages'] = stages.map((stage: any) => {
			// 			return {
			// 				...stage.fields,
			// 				id: stage.id,
			// 			}
			// 		})
			// 		const currentStage = stages.find((s: any) => s.get('Status') === 'Active')
			// 		_output.Stage = currentStage?.get('Name')
			// 	}
			// 	const membersIds = season.get('Members') as string[]
			// 	if (membersIds?.length) {
			// 		const members = await AirtableService('Project Members')
			// 			.select({
			// 				fields: [],
			// 				filterByFormula: `AND(FIND(Status, "Member Fired"), FIND(RECORD_ID(), "${membersIds.join(' ')}"))`,
			// 			})
			// 			.all()
			// 		_output.membersCount = _output.projectsCount + members?.length || 0
			// 	}
			output.push(_output)
		}

		return output
	}
}

export default createHandler(ApiSeasonsHandler)
