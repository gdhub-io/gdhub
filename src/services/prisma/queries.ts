import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { prisma } from '.'

export type ProjectWithActivity = prismaClient.Project & {
	reportCount: number
	lastPostAt: Date | null
	firstPostAt: Date | null
	recentProjectReportCount: number
	recentProjectChangeCount: number
	activityScore: number
	isInactive: boolean
}

export const getWorkedProjects = async () => {
	const projects = await prisma.project.getProjectsOrderedByActivity({ order: 'desc' })

	return projects as ProjectWithActivity[]
}
