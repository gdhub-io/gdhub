import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'

/**
 * Interface for transferring shares between participants
 */
export interface EquityTransferRequest {
	fromUserId: string
	toUserId: string
	projectId: string
	percentage: number
	reason?: string
}

/**
 * Interface for creating a new equity promise
 */
export interface EquityPromiseRequest {
	projectId: string
	userId: string
	percentage: number
	targetStepId?: string
	description?: string
}

/**
 * Interface for creating a member share
 */
export interface CreateMemberShareRequest {
	projectId: string
	memberId: string
	percentage: number
	targetStepId: string
	createdById: string
}

/**
 * Interface for input data to get transaction history
 */
export interface GetEquityHistoryInput {
	projectId: string
	userId?: string
	page?: number
	limit?: number
}

/**
 * Interface for output data of transaction history
 */
export interface GetEquityHistoryOutput {
	transactions: any[]
	pagination: {
		total: number
		page: number
		limit: number
		totalPages: number
	}
}

/**
 * Service for working with project equity
 */
export class ProjectEquityRepository {
	/**
	 * Get current equity distribution for project
	 */
	static async getProjectEquity(projectId: string) {
		try {
			// Get data about equity from database
			const equity = await prisma.projectEquity.findUnique({
				where: { projectId },
				include: {
					equityAllocations: {
						include: {
							owner: {
								select: {
									id: true,
									name: true,
									image: true,
								},
							},
							promises: true,
						},
					},
				},
			})

			if (!equity) {
				// If equity is not defined, create record with default values
				const newEquity = await prisma.projectEquity.create({
					data: {
						projectId,
						platformShare: 3.0,
						mentorFundShare: 7.0,
						investmentReserve: 40.0,
					},
					include: {
						equityAllocations: true,
					},
				})

				return newEquity
			}

			return equity
		} catch (error: any) {
			console.error('Error getting project equity:', error)
			throw new Error(error.message || 'The error occurred while getting the project equity')
		}
	}

	/**
	 * Update project equity data
	 */
	static async updateProjectEquity(projectId: string, data: prismaClient.ProjectEquity) {
		try {
			// Check if project exists
			const project = await prisma.project.findUnique({
				where: { id: projectId },
			})

			if (!project) {
				throw new Error('Project not found')
			}

			// Update main equity data
			const updatedEquity = await prisma.projectEquity.upsert({
				where: { projectId },
				update: {
					platformShare: data.platformShare,
					mentorFundShare: data.mentorFundShare,
					investmentReserve: data.investmentReserve,
				},
				create: {
					projectId,
					platformShare: data.platformShare,
					mentorFundShare: data.mentorFundShare,
					investmentReserve: data.investmentReserve,
				},
				include: {
					equityAllocations: true,
				},
			})

			return updatedEquity
		} catch (error: any) {
			console.error('Error updating project equity:', error)
			throw new Error(error.message || 'The error occurred while updating the project equity')
		}
	}

	/**
	 * Get member share
	 */
	static async getMemberShare(projectId: string, memberId: string) {
		try {
			// Get data about project and member
			const teamMember = await prisma.teamMember.findUnique({
				where: { id: memberId },
				include: { user: true },
			})

			if (!teamMember) {
				throw new Error('Team member not found')
			}

			// Get data about project equity
			const equity = await prisma.projectEquity.findUnique({
				where: { projectId },
				include: {
					equityAllocations: true,
				},
			})

			if (!equity) {
				throw new Error('Project equity not found')
			}

			// Get member share
			const memberPromise = equity.equityAllocations.find(
				(allocation: { teamMemberId?: string | null }) => allocation.teamMemberId === memberId
			)
			const memberShare = equity.equityAllocations.find(
				(allocation: { teamMemberId?: string | null }) => allocation.teamMemberId === memberId
			)

			return memberShare
		} catch (error: any) {
			console.error('Error getting member share:', error)
			throw new Error(error.message || 'The error occurred while getting the member share')
		}
	}

	/**
	 * Create member share
	 */
	static async createMemberShare(data: CreateMemberShareRequest) {
		try {
			const { projectId, memberId, percentage, targetStepId, createdById } = data

			// Get data about project and member
			const teamMember = await prisma.teamMember.findUnique({
				where: { id: memberId },
				include: { user: true },
			})

			if (!teamMember) {
				throw new Error('Team member not found')
			}

			// Get data about project equity
			const equity = await prisma.projectEquity.findUnique({
				where: { projectId },
				include: {
					equityAllocations: true,
				},
			})

			if (!equity) {
				throw new Error('Project equity not found')
			}

			// Check if allocation already exists for this member
			let allocation = await prisma.equityAllocation.findFirst({
				where: {
					equityId: equity.id,
					teamMemberId: memberId,
				},
				include: {
					promises: true,
				},
			})

			// Check if promise already exists for this member
			if (allocation?.promises.length) {
				throw new Error('Promise already exists for this member')
			}

			// Create empty allocation if it doesn't exist
			if (!allocation) {
				allocation = await prisma.equityAllocation.create({
					data: {
						equityId: equity.id,
						ownerId: teamMember.userId,
						teamMemberId: memberId,
						percentage: 0,
					},
					include: {
						promises: true,
					},
				})
			}

			// Then create promise if needed
			if (targetStepId) {
				await prisma.equityPromise.create({
					data: {
						allocationId: allocation.id,
						percentage,
						targetStepId,
						createdById,
					},
				})
			}

			// Create transaction for initial allocation
			await prisma.equityTransaction.create({
				data: {
					toAllocationId: allocation.id,
					percentage,
					transactionType: prismaClient.EquityTransactionType.InitialAllocation,
					reason: 'Initial equity allocation',
					createdById,
				},
			})

			return allocation
		} catch (error: any) {
			console.error('Error creating member share:', error)
			throw new Error(error.message || 'The error occurred while creating the member share')
		}
	}

	/**
	 * Update member share
	 */
	static async updateMemberShare(
		projectId: string,
		memberId: string,
		percentage: number,
		vested: boolean,
		targetStepId?: string
	) {
		try {
			// Get data about project and member
			const teamMember = await prisma.teamMember.findUnique({
				where: { id: memberId },
				include: { user: true },
			})

			if (!teamMember) {
				throw new Error('Team member not found')
			}

			// Get data about project equity
			const equity = await prisma.projectEquity.findUnique({
				where: { projectId },
				include: {
					equityAllocations: true,
				},
			})

			if (!equity) {
				throw new Error('Project equity not found')
			}

			// First check if allocation already exists for this member
			let allocation = await prisma.equityAllocation.findFirst({
				where: {
					equityId: equity.id,
					teamMemberId: memberId,
				},
			})

			if (allocation) {
				// Update existing allocation
				allocation = await prisma.equityAllocation.update({
					where: { id: allocation.id },
					data: {
						percentage,
					},
				})
			} else {
				// Create new allocation
				allocation = await prisma.equityAllocation.create({
					data: {
						equityId: equity.id,
						ownerId: teamMember.userId,
						teamMemberId: memberId,
						percentage,
					},
				})

				// Create transaction for initial allocation
				await prisma.equityTransaction.create({
					data: {
						toAllocationId: allocation.id,
						percentage,
						transactionType: prismaClient.EquityTransactionType.InitialAllocation,
						reason: 'Initial equity allocation',
						createdById: teamMember.userId, // Или можно использовать ID автора проекта
					},
				})
			}

			// If targetStepId is specified, create or update promise
			if (targetStepId) {
				// Check if promise already exists
				const existingPromise = await prisma.equityPromise.findFirst({
					where: {
						allocationId: allocation.id,
						targetStepId,
					},
				})

				if (existingPromise) {
					// Update existing promise
					await prisma.equityPromise.update({
						where: { id: existingPromise.id },
						data: {
							percentage,
							isExecuted: false,
						},
					})
				} else {
					// Create new promise
					await prisma.equityPromise.create({
						data: {
							allocationId: allocation.id,
							percentage,
							targetStepId,
							isExecuted: false,
							createdById: teamMember.userId, // Или можно использовать ID автора проекта
						},
					})
				}
			}

			return allocation
		} catch (error: any) {
			console.error('Error updating member share:', error)
			throw new Error(error.message || 'The error occurred while updating the member share')
		}
	}

	/**
	 * Transfer share from one participant to another
	 */
	static async transferShare(data: EquityTransferRequest) {
		try {
			const { projectId, fromUserId, toUserId, percentage, reason } = data

			if (fromUserId === toUserId) {
				throw new Error('Cannot transfer equity to the same user')
			}

			// Get data about project equity
			const equity = await prisma.projectEquity.findUnique({
				where: { projectId },
				include: {
					equityAllocations: true,
					project: true,
				},
			})

			if (!equity) {
				throw new Error('Project equity not found')
			}

			// Check if sender has allocation
			const fromAllocation = await prisma.equityAllocation.findFirst({
				where: {
					equityId: equity.id,
					ownerId: fromUserId,
				},
			})

			if (!fromAllocation) {
				throw new Error('Sender does not have any equity allocation')
			}

			if (fromAllocation.percentage < percentage) {
				throw new Error('Not enough equity to transfer')
			}

			// Find or create allocation for recipient
			let toAllocation = await prisma.equityAllocation.findFirst({
				where: {
					equityId: equity.id,
					ownerId: toUserId,
				},
			})

			if (!toAllocation) {
				// Get TeamMember ID for recipient, if he is in the team
				const teamMember = await prisma.teamMember.findFirst({
					where: {
						userId: toUserId,
						teamId: equity.project.teamId,
					},
				})

				// Create new allocation for recipient
				toAllocation = await prisma.equityAllocation.create({
					data: {
						equityId: equity.id,
						ownerId: toUserId,
						teamMemberId: teamMember?.id || null,
						percentage: 0, // Initial share 0, will be updated below
					},
				})
			}

			// Update sender and recipient shares in one transaction
			await prisma.$transaction([
				prisma.equityAllocation.update({
					where: { id: fromAllocation.id },
					data: {
						percentage: fromAllocation.percentage - percentage,
					},
				}),
				prisma.equityAllocation.update({
					where: { id: toAllocation.id },
					data: {
						percentage: toAllocation.percentage + percentage,
					},
				}),
				prisma.equityTransaction.create({
					data: {
						fromAllocationId: fromAllocation.id,
						toAllocationId: toAllocation.id,
						percentage,
						transactionType: prismaClient.EquityTransactionType.Transfer,
						reason: reason || 'Equity transfer',
						createdById: fromUserId,
					},
				}),
			])

			return {
				fromUser: { id: fromUserId, newPercentage: fromAllocation.percentage - percentage },
				toUser: { id: toUserId, newPercentage: toAllocation.percentage + percentage },
				transferredPercentage: percentage,
			}
		} catch (error: any) {
			console.error('Error transferring equity:', error)
			throw new Error(error.message || 'The error occurred while transferring the share')
		}
	}

	/**
	 * Get transaction history
	 */
	static async getTransactionHistory(data: GetEquityHistoryInput) {
		try {
			const { projectId, userId, page = 1, limit = 10 } = data

			// Find record about project equity
			const equity = await prisma.projectEquity.findUnique({
				where: { projectId },
			})

			if (!equity) {
				throw new Error('Project equity not found')
			}

			// Build query for filtering transactions
			const where: any = {}

			if (userId) {
				// If userId is specified, find his allocation
				const allocations = await prisma.equityAllocation.findMany({
					where: {
						equityId: equity.id,
						ownerId: userId,
					},
					select: { id: true },
				})

				const allocationIds = allocations.map((a: { id: string }) => a.id)

				// Filter transactions where user was sender or recipient
				where.OR = [{ fromAllocationId: { in: allocationIds } }, { toAllocationId: { in: allocationIds } }]
			} else {
				// Otherwise get all allocations for this equity
				const allocations = await prisma.equityAllocation.findMany({
					where: {
						equityId: equity.id,
					},
					select: { id: true },
				})

				const allocationIds = allocations.map((a: { id: string }) => a.id)

				// Filter transactions for all allocations of this equity
				where.OR = [{ fromAllocationId: { in: allocationIds } }, { toAllocationId: { in: allocationIds } }]
			}

			// Get total number of transactions for pagination
			const total = await prisma.equityTransaction.count({ where })

			// Get transactions with pagination
			const transactions = await prisma.equityTransaction.findMany({
				where,
				include: {
					fromAllocation: {
						include: {
							owner: {
								select: {
									id: true,
									name: true,
									image: true,
								},
							},
						},
					},
					toAllocation: {
						include: {
							owner: {
								select: {
									id: true,
									name: true,
									image: true,
								},
							},
						},
					},
					createdBy: {
						select: {
							id: true,
							name: true,
							image: true,
						},
					},
					promise: true,
				},
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
			})

			return {
				transactions,
				pagination: {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				},
			}
		} catch (error: any) {
			console.error('Error getting transaction history:', error)
			throw new Error(error.message || 'The error occurred while getting the transaction history')
		}
	}
}
