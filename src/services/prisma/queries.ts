import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { prisma } from '.'

export const getWorkedProjects = async () => {
	return await prisma.project.findMany({
		where: {
			status: { in: [prismaClient.ProjectStatus.Approved, prismaClient.ProjectStatus.Done] },
			workflow: { currentStep: { order: { gt: 0 } } },
		},
		include: {
			author: { select: { name: true } },
			workflow: { select: { currentStep: true } },
		},
	})
}
