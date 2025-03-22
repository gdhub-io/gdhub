import { NextAuthGuard } from '@/lib/api-middlewares'
import { ProjectEquityRepository } from '@/repositories/project-equity.repository'
import { prisma } from '@/services/prisma'
import { IsNotEmpty, IsNumber, IsString, Min, IsOptional } from 'class-validator'
import { Body, Post, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class UpdateMemberShareDto {
	@IsString()
	@IsNotEmpty()
	projectId: string

	@IsString()
	@IsNotEmpty()
	memberId: string

	@IsNumber()
	@Min(0)
	percentage: number

	@IsString()
	@IsOptional()
	targetStepId?: string
}

@NextAuthGuard('user')
class ApiMemberShareHandler {
	@Post()
	public async updateMemberShare(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: UpdateMemberShareDto) {
		const { projectId, memberId, percentage, targetStepId } = data

		if (!targetStepId) {
			throw new Error('Target step ID is required')
		}

		// Check if the project exists
		const project = await prisma.project.findUnique({
			where: { id: projectId },
			include: {
				team: {
					include: {
						members: true,
					},
				},
			},
		})

		if (!project) {
			throw new Error('Project not found')
		}

		// Check if the current user is the project author
		if (project.authorId !== req.user.id) {
			throw new Error('You do not have permission to update the member shares')
		}

		// Get the information about the current project workflow
		const workflow = await prisma.projectWorkflow.findFirst({
			where: { projectId },
			include: {
				currentStep: true,
			},
		})

		// Check if the specified step has been reached for vesting
		let vested = true
		if (targetStepId && workflow?.currentStep) {
			// Get the information about the step that will be used for vesting
			const targetStep = await prisma.projectWorkflowStep.findUnique({
				where: { id: targetStepId },
			})

			// Check if the project is on the specified step or has passed it
			if (targetStep && workflow.currentStep.order < targetStep.order) {
				vested = false // The share is not vested yet, since the target step has not been reached
			}
		}

		const equity = await ProjectEquityRepository.getProjectEquity(projectId)

		// Get the current data about the shares
		let memberShare = await ProjectEquityRepository.getMemberShare(projectId, memberId)

		if (!memberShare || targetStepId) {
			memberShare = await ProjectEquityRepository.createMemberShare({
				projectId,
				memberId,
				percentage,
				targetStepId,
				createdById: req.user.id,
			})
		}

		// Check if the total sum does not exceed 100%
		const totalTeamShares = equity.equityAllocations.reduce((sum: number, share: any) => sum + share.percentage, 0)
		const totalAllocation = equity.platformShare + equity.mentorFundShare + equity.investmentReserve + totalTeamShares

		if (totalAllocation > 100) {
			throw new Error('Total share exceeds 100%')
		}

		return { ...memberShare, percentage }
	}
}

export default createHandler(ApiMemberShareHandler)
