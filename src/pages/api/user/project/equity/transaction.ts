import { NextAuthGuard } from '@/lib/api-middlewares'
import { EquityTransferRequest, ProjectEquityRepository } from '@/repositories/project-equity.repository'
import { prisma } from '@/services/prisma'
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Body, createHandler, Get, Post, Query, Req, ValidationPipe } from 'next-api-decorators'

class ProjectEquityQueryDto {
	@IsString()
	@IsNotEmpty()
	projectId: string
}

class UserEquityQueryDto extends ProjectEquityQueryDto {
	@IsString()
	@IsNotEmpty()
	userId: string
}

class EquityTransferDto {
	@IsString()
	@IsNotEmpty()
	projectId: string

	@IsString()
	@IsNotEmpty()
	toUserId: string

	@IsNumber()
	@Min(0.01)
	percentage: number

	@IsString()
	@IsOptional()
	reason?: string
}

@NextAuthGuard('user')
class ApiEquityTransactionHandler {
	/**
	 * Get the transaction history for a project
	 */
	@Get()
	public async getProjectTransactions(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { projectId }: ProjectEquityQueryDto
	) {
		// Check if the project exists
		const project = await prisma.project.findUnique({
			where: { id: projectId },
		})

		if (!project) {
			throw new Error('Project not found')
		}

		// Only the project author or participants can get the transaction history
		const teamMember = await prisma.teamMember.findFirst({
			where: {
				userId: req.user.id,
				team: { project: { id: projectId } },
			},
		})

		if (project.authorId !== req.user.id && !teamMember) {
			throw new Error('You do not have permission to view the transaction history')
		}

		// Get the transactions
		const transactions = await ProjectEquityRepository.getTransactionHistory({
			projectId,
		})

		return transactions
	}

	/**
	 * Get the transaction history for a specific user
	 */
	@Get('user')
	public async getUserTransactions(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { projectId, userId }: UserEquityQueryDto
	) {
		// Check if the project exists
		const project = await prisma.project.findUnique({
			where: { id: projectId },
		})

		if (!project) {
			throw new Error('Project not found')
		}

		// The user can only get their own history or if they are the project author
		if (userId !== req.user.id && project.authorId !== req.user.id) {
			throw new Error('You do not have permission to view the transaction history of this user')
		}

		// Get the transactions
		const transactions = await ProjectEquityRepository.getTransactionHistory({
			projectId,
			userId,
		})

		return transactions
	}

	/**
	 * Transfer share to another user
	 */
	@Post('transfer')
	public async transferEquity(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: EquityTransferDto) {
		const { projectId, toUserId, percentage, reason } = data

		// Check if the project exists
		const project = await prisma.project.findUnique({
			where: { id: projectId },
		})

		if (!project) {
			throw new Error('Project not found')
		}

		// Get the shares of the current user
		const fromUserId = req.user.id

		const transferRequest: EquityTransferRequest = {
			fromUserId,
			toUserId,
			projectId,
			percentage,
			reason,
		}

		// Perform the share transfer
		const result = await ProjectEquityRepository.transferShare({
			fromUserId,
			toUserId,
			projectId,
			percentage,
			reason,
		})

		return result
	}
}

export default createHandler(ApiEquityTransactionHandler)
