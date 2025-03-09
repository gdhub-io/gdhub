import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { prisma } from '.'

export const getWorkedProjects = async () => {
	return await prisma.project.findMany({
		where: {
			status: { in: [prismaClient.ProjectStatus.Approved, prismaClient.ProjectStatus.Done] },
			workflow: { steps: { some: { isCurrent: true, order: { gt: 0 } } } },
		},
		include: {
			author: { select: { name: true } },
			workflow: { select: { steps: { select: { id: true, name: true }, orderBy: { order: 'asc' } } } },
		},
	})
}
