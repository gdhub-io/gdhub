import { NextAuthGuard } from '@/lib/api-middlewares'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/services/prisma'
import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator'
import { ValidationPipe } from 'next-api-decorators'
import { Body, createHandler, Get, Post, Query } from 'next-api-decorators'
import { getServerSession } from 'next-auth'

// Временное хранилище данных о долях проекта (в памяти сервера)
// В реальном приложении эти данные должны быть в базе данных
const projectEquityStore: Record<string, ProjectEquityData> = {}

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
	@Min(3)
	platformShare: number

	@IsNumber()
	@Min(7)
	mentorFundShare: number

	@IsNumber()
	@Min(0)
	investmentReserve: number

	@ValidateNested({ each: true })
	@Type(() => EquityShareDto)
	teamShares: EquityShareDto[]
}

// Формат данных для хранения информации о долях
interface ProjectEquityData {
	projectId: string
	platformShare: number
	mentorFundShare: number
	investmentReserve: number
	teamShares: Array<{
		memberId: string
		percentage: number
		targetStepId?: string | null
		isFixed: boolean
		vested: boolean
	}>
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

		// Получаем сохраненные доли из временного хранилища
		const equity = projectEquityStore[projectId]

		// Если не существует, возвращаем дефолтные значения
		if (!equity) {
			return {
				platformShare: 3,
				mentorFundShare: 7,
				investmentReserve: 40,
				teamShares: [],
			}
		}

		return equity
	}

	@Post()
	public async save(@Body(ValidationPipe) equityData: ProjectEquityDto) {
		const { projectId, platformShare, mentorFundShare, investmentReserve, teamShares } = equityData

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
		const totalTeamShares = teamShares.reduce((sum, share) => sum + share.percentage, 0)
		const totalAllocation = platformShare + mentorFundShare + investmentReserve + totalTeamShares

		if (totalAllocation > 100) {
			throw new Error('Total allocation exceeds 100%')
		}

		if (platformShare < 3) {
			throw new Error('Platform share must be at least 3%')
		}

		if (mentorFundShare < 7) {
			throw new Error('Mentor fund share must be at least 7%')
		}

		// Сохраняем данные во временное хранилище
		const updatedEquity: ProjectEquityData = {
			projectId,
			platformShare,
			mentorFundShare,
			investmentReserve,
			teamShares: teamShares.map((share) => ({
				memberId: share.memberId,
				percentage: share.percentage,
				targetStepId: share.targetStepId,
				isFixed: share.isFixed || false,
				vested: true, // По умолчанию все доли считаются полученными
			})),
			createdAt: projectEquityStore[projectId]?.createdAt || new Date(),
			updatedAt: new Date(),
		}

		projectEquityStore[projectId] = updatedEquity

		return updatedEquity
	}
}

export default createHandler(ApiProjectEquityHandler)
