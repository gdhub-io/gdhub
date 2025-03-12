import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { prisma } from '.'

export const getWorkedProjects = async () => {
	const projects = await prisma.project.findMany({
		where: {
			status: { in: [prismaClient.ProjectStatus.Approved, prismaClient.ProjectStatus.Done] },
			workflow: { currentStep: { order: { gt: 0 } } },
		},
		include: {
			author: { select: { name: true } },
			workflow: { select: { currentStep: { select: { id: true, name: true } } } },
		},
	})

	return projects as (prismaClient.Project & {
		author: prismaClient.User
		workflow: prismaClient.ProjectWorkflow & { currentStep: prismaClient.ProjectWorkflowStep }
	})[]
}
