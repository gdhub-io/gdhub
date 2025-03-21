import { NextAuthGuard } from '@/lib/api-middlewares'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/services/prisma'
import { IsNotEmpty, IsNumber, IsString, Min, IsOptional } from 'class-validator'
import { Body, Post, ValidationPipe, createHandler } from 'next-api-decorators'
import { getServerSession } from 'next-auth'

// Временное хранилище данных в памяти
// (в реальном проекте это должно быть в базе данных)
const projectEquityStore: Record<string, any> = {}

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

interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

@NextAuthGuard('user')
class ApiMemberShareHandler {
	@Post()
	public async updateMemberShare(@Body(ValidationPipe) data: UpdateMemberShareDto): Promise<ApiResponse<any>> {
		try {
			const { projectId, memberId, percentage, targetStepId } = data

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
				return {
					success: false,
					error: 'Проект не найден',
				}
			}

			// Проверяем права пользователя на проект
			const session = await getServerSession(authOptions)
			if (!session || !session.user) {
				return {
					success: false,
					error: 'Необходима авторизация',
				}
			}

			// Проверяем, что текущий пользователь является автором проекта
			if (project.authorId !== session.user.id) {
				return {
					success: false,
					error: 'У вас нет прав для изменения долей участников',
				}
			}

			// Получаем информацию о текущем шаге проекта
			const workflow = await prisma.projectWorkflow.findFirst({
				where: { projectId },
				include: {
					currentStep: true,
				},
			})

			// Проверяем, достигнут ли указанный шаг для vesting
			let vested = true
			if (targetStepId && workflow?.currentStep) {
				// Получаем информацию о шаге, на котором будет происходить vesting
				const targetStep = await prisma.projectWorkflowStep.findUnique({
					where: { id: targetStepId },
				})

				// Проверяем, находится ли проект на указанном шаге или прошел его
				if (targetStep && workflow.currentStep.order < targetStep.order) {
					vested = false // Доля еще не вестирована, т.к. нужный шаг не достигнут
				}
			}

			// Получаем текущие данные о долях
			const equity = projectEquityStore[projectId] || {
				projectId,
				platformShare: 3,
				mentorFundShare: 7,
				investmentReserve: 40,
				teamShares: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			// Находим долю участника или создаем новую
			const memberShareIndex = equity.teamShares.findIndex((share: any) => share.memberId === memberId)

			if (memberShareIndex >= 0) {
				equity.teamShares[memberShareIndex].percentage = percentage
				equity.teamShares[memberShareIndex].targetStepId = targetStepId
				equity.teamShares[memberShareIndex].vested = vested
			} else {
				equity.teamShares.push({
					memberId,
					percentage,
					targetStepId,
					vested,
					isFixed: false,
				})
			}

			// Проверяем, что общая сумма не превышает 100%
			const totalTeamShares = equity.teamShares.reduce((sum: number, share: any) => sum + share.percentage, 0)
			const totalAllocation = equity.platformShare + equity.mentorFundShare + equity.investmentReserve + totalTeamShares

			if (totalAllocation > 100) {
				return {
					success: false,
					error: 'Общая доля превышает 100%',
				}
			}

			// Обновляем данные в хранилище
			equity.updatedAt = new Date()
			projectEquityStore[projectId] = equity

			return {
				success: true,
				data: equity,
			}
		} catch (error: any) {
			console.error('Ошибка при обновлении доли участника:', error)
			return {
				success: false,
				error: error.message || 'Произошла ошибка при обновлении доли участника',
			}
		}
	}
}

export default createHandler(ApiMemberShareHandler)
