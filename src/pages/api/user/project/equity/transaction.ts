import { NextAuthGuard } from '@/lib/api-middlewares'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { EquityTransferRequest, ProjectEquityRepository } from '@/repositories/project-equity.repository'
import { prisma } from '@/services/prisma'
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Body, createHandler, Get, Post, Query, ValidationPipe } from 'next-api-decorators'
import { getServerSession } from 'next-auth'

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

interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

@NextAuthGuard('user')
class ApiEquityTransactionHandler {
	/**
	 * Get the transaction history for a project
	 */
	@Get()
	public async getProjectTransactions(
		@Query(ValidationPipe) { projectId }: ProjectEquityQueryDto
	): Promise<ApiResponse<any>> {
		try {
			// Check if the project exists
			const project = await prisma.project.findUnique({
				where: { id: projectId },
			})

			if (!project) {
				return {
					success: false,
					error: 'Project not found',
				}
			}

			// Check if the user has permission to view the project
			const session = await getServerSession(authOptions)
			if (!session || !session.user) {
				return {
					success: false,
					error: 'Authorization is required',
				}
			}

			// Only the project author or participants can get the transaction history
			const teamMember = await prisma.teamMember.findFirst({
				where: {
					userId: session.user.id,
					team: { project: { id: projectId } },
				},
			})

			if (project.authorId !== session.user.id && !teamMember) {
				return {
					success: false,
					error: 'You do not have permission to view the transaction history',
				}
			}

			// Get the transactions
			const transactions = await ProjectEquityRepository.getTransactionHistory({
				projectId,
			})

			return {
				success: true,
				data: transactions,
			}
		} catch (error: any) {
			console.error('The error occurred while getting the transaction history:', error)
			return {
				success: false,
				error: error.message || 'The error occurred while getting the transaction history',
			}
		}
	}

	/**
	 * Get the transaction history for a specific user
	 */
	@Get('user')
	public async getUserTransactions(
		@Query(ValidationPipe) { projectId, userId }: UserEquityQueryDto
	): Promise<ApiResponse<any>> {
		try {
			// Check if the project exists
			const project = await prisma.project.findUnique({
				where: { id: projectId },
			})

			if (!project) {
				return {
					success: false,
					error: 'Project not found',
				}
			}

			// Check if the user has permission to view the project
			const session = await getServerSession(authOptions)
			if (!session || !session.user) {
				return {
					success: false,
					error: 'Authorization is required',
				}
			}

			// The user can only get their own history or if they are the project author
			if (userId !== session.user.id && project.authorId !== session.user.id) {
				return {
					success: false,
					error: 'You do not have permission to view the transaction history of this user',
				}
			}

			// Get the transactions
			const transactions = await ProjectEquityRepository.getTransactionHistory({
				projectId,
				userId,
			})

			return {
				success: true,
				data: transactions,
			}
		} catch (error: any) {
			console.error('The error occurred while getting the transaction history:', error)
			return {
				success: false,
				error: error.message || 'The error occurred while getting the transaction history',
			}
		}
	}

	/**
	 * Transfer share to another user
	 */
	@Post('transfer')
	public async transferEquity(@Body(ValidationPipe) data: EquityTransferDto): Promise<ApiResponse<any>> {
		try {
			const { projectId, toUserId, percentage, reason } = data

			// Check if the project exists
			const project = await prisma.project.findUnique({
				where: { id: projectId },
			})

			if (!project) {
				return {
					success: false,
					error: 'Project not found',
				}
			}

			// Check if the user has permission to view the project
			const session = await getServerSession(authOptions)
			if (!session || !session.user) {
				return {
					success: false,
					error: 'Authorization is required',
				}
			}

			// Get the shares of the current user
			const fromUserId = session.user.id

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

			return {
				success: true,
				data: result,
			}
		} catch (error: any) {
			console.error('The error occurred while transferring the share:', error)
			return {
				success: false,
				error: error.message || 'The error occurred while transferring the share',
			}
		}
	}
}

export default createHandler(ApiEquityTransactionHandler)
