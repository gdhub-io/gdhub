import { ProjectStatus } from '@prisma/client'
import { DefaultSeasonStages } from './extenstions/season'
import { prisma } from '.'

export const getWorkedProjects = async () => {
	return await prisma.project.findMany({
		where: {
			status: { in: [ProjectStatus.Approved, ProjectStatus.Done] },
			stage: {
				name: { notIn: [DefaultSeasonStages.Ideation, DefaultSeasonStages.Concepting] },
			},
		},
		include: {
			stage: { select: { id: true, name: true, season: { select: { id: true, name: true } } } },
			author: { select: { name: true } },
		},
	})
}
