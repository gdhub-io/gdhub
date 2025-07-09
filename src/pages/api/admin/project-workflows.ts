import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Get, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user', [prismaClient.UserRole.Admin])
class ApiProjectWorkflowsAdminHandler {
	constructor() {}

	@Get()
	public async list(@Req() req: NextApiRequestWithUser) {
		const projectWorkflows = await prisma.projectWorkflow.findMany({
			include: {
				project: {
					select: {
						id: true,
						name: true,
						slug: true,
						author: {
							select: {
								name: true,
							},
						},
					},
				},
				currentStep: {
					select: {
						name: true,
						order: true,
					},
				},
				steps: {
					include: {
						tasks: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		// Add analytics to each workflow
		const workflowsWithAnalytics = projectWorkflows.map((workflow: any) => {
			const totalTasks = workflow.steps.reduce((total: number, step: any) => total + step.tasks.length, 0)
			const completedTasks = workflow.steps.reduce(
				(total: number, step: any) => total + step.tasks.filter((task: any) => task.done).length,
				0
			)
			const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

			// Calculate days in progress
			const createdAt = new Date(workflow.createdAt)
			const now = new Date()
			const daysInProgress = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

			return {
				...workflow,
				analytics: {
					totalTasks,
					completedTasks,
					completionPercentage,
					daysInProgress,
					currentStepName: workflow.currentStep?.name || 'Не начат',
					currentStepOrder: workflow.currentStep?.order || 0,
					totalSteps: workflow.steps.length,
				},
			}
		})

		return workflowsWithAnalytics
	}
}

export default createHandler(ApiProjectWorkflowsAdminHandler)
