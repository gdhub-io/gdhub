import { NextAuthGuard } from '@/lib/api-middlewares'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/services/prisma'
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { ValidationPipe } from 'next-api-decorators'
import { Body, createHandler, Get, Post, Query } from 'next-api-decorators'
import { getServerSession } from 'next-auth'

class EquityShareDto {
	@IsString()
	@IsNotEmpty()
	memberId: string

	@IsNumber()
	@Min(0)
	percentage: number

	@IsString()
	@IsOptional()
	targetStepId?: string | null

	@IsOptional()
	isFixed: boolean
}

class ProjectEquityDto {
	@IsString()
	@IsNotEmpty()
	projectId: string

	@IsNumber()
	@Min(7)
	mentorFundShare: number

	@IsNumber()
	@Min(0)
	investmentReserve: number
}

// Формат данных для хранения информации о долях
interface ProjectEquityData {
	projectId: string
	mentorFundShare: number
	investmentReserve: number
	createdAt: Date
	updatedAt: Date
}

class ProjectEquityQueryDto {
	@IsString()
	@IsNotEmpty()
	projectId: string
}

@NextAuthGuard('user')
class ApiProjectEquityHandler {
	@Get()
	public async get(@Query(ValidationPipe) { projectId }: ProjectEquityQueryDto) {
		const projectEquity = await prisma.projectEquity.findUnique({
			where: { projectId },
			include: {
				equityAllocations: true,
			},
		})

		if (!projectEquity) {
			throw new Error('Project not found')
		}

		// If equity is not set, return default values
		if (!projectEquity) {
			return {
				platformShare: 3,
				mentorFundShare: 7,
				investmentReserve: 40,
			}
		}

		return projectEquity
	}

	@Post()
	public async save(@Body(ValidationPipe) equityData: ProjectEquityDto) {
		const { projectId, mentorFundShare, investmentReserve } = equityData

		// Проверяем существование проекта
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

		// Проверяем права пользователя на проект
		const session = await getServerSession(authOptions)
		if (!session || !session.user) {
			throw new Error('Unauthorized')
		}

		// Проверяем, что текущий пользователь является автором проекта
		if (project.authorId !== session.user.id) {
			throw new Error('You are not authorized to modify this project equity')
		}

		// Проверяем корректность распределения долей
		const totalAllocation = mentorFundShare + investmentReserve

		if (totalAllocation > 100) {
			throw new Error('Total allocation exceeds 100%')
		}

		if (totalAllocation < 10) {
			throw new Error('Total allocation must be at least 10%')
		}

		if (mentorFundShare < 7) {
			throw new Error('Mentor fund share must be at least 2%')
		}

		// Сохраняем данные во временное хранилище
		const updatedEquity: ProjectEquityData = {
			projectId,
			mentorFundShare,
			investmentReserve,
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		return updatedEquity
	}
}

export default createHandler(ApiProjectEquityHandler)
