import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { DefaultSeasonStages } from '@gdhub-io/gdhub-prisma/src/enums'
import { prisma } from '.'

export const getWorkedProjects = async () => {
	return await prisma.project.findMany({
		where: {
			status: { in: [prismaClient.ProjectStatus.Approved, prismaClient.ProjectStatus.Done] },
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
