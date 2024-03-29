import { DefaultSeasonStages } from '@/types/enums'
import { Prisma } from '@prisma/client'

export const projectPrismaExtension = Prisma.defineExtension((client) => {
	return client.$extends({
		name: 'project-extenstion',
		model: {
			project: {
				async conditionStatus({ projectId, stageId }: { projectId: string; stageId?: string }) {
					const project = await client.project.findUnique({ where: { id: projectId }, include: { stage: true } })
					const stage = stageId ? await client.seasonStage.findUnique({ where: { id: stageId } }) : project?.stage
					const conditions = stage?.conditions as Record<string, any>[]
					const response: Record<string, any> & { completed: boolean } = {
						completed: true,
					}

					if (!project || !conditions || !Array.isArray(conditions) || conditions.length == 0) {
						return response
					}

					for (const condition of conditions) {
						const [model, parameter] = condition.field.split('.') as [string, keyof typeof project]

						if (condition.required) {
							if (model == 'project') {
								response[condition.field] = !!project[parameter]
							}
						}

						if (condition.equals) {
							if (model == 'project') {
								response[condition.field] = project[parameter] == condition.equals
							}
						}

						if (response[condition.field] == false) {
							response.completed = false
						}
					}

					return response
				},
			},
		},
	})
})
export { DefaultSeasonStages }
