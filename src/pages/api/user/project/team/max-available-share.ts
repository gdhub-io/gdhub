import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsString } from 'class-validator'
import { Get, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamIdDto {
	@IsString()
	id: string
}

@NextAuthGuard('user')
class ApiTeamMaxAvailableShareHandler {
	@Get()
	async get(@Query(ValidationPipe) { id }: ParamIdDto) {
		const team = await prisma.team.findUnique({
			where: { id },
			include: {
				project: {
					include: {
						equity: {
							include: {
								equityAllocations: {
									include: {
										promises: true,
									},
								},
							},
						},
					},
				},
				members: {
					include: {
						equityAllocations: {
							include: {
								promises: true,
							},
						},
					},
				},
				vacancies: {
					where: {
						status: { in: [prismaClient.TeamVacancyStatus.Published, prismaClient.TeamVacancyStatus.Draft] },
					},
				},
			},
		})

		if (!team) {
			throw new Error('Team not found')
		}

		// Считаем общую сумму промисов из вакансий
		const vacanciesPromisesSum = team.vacancies.reduce(
			(sum: number, vacancy: { promisePercentage?: number | null }) => {
				return sum + (vacancy.promisePercentage || 0)
			},
			0
		)

		// Считаем общую сумму промисов из членов команды
		const membersPromisesSum = team.members.reduce(
			(sum: number, member: { equityAllocations: { percentage: number }[] }) => {
				return (
					sum +
					member.equityAllocations.reduce(
						(promiseSum: number, promise: { percentage: number }) => promiseSum + promise.percentage,
						0
					)
				)
			},
			0
		)

		// Считаем общую сумму промисов из распределения долей проекта
		const projectPromisesSum = team.project?.equity?.equityAllocations.reduce(
			(sum: number, allocation: { percentage: number; promises: { percentage: number }[] }) => {
				return (
					sum +
					allocation.percentage +
					allocation.promises.reduce((promiseSum, promise) => promiseSum + promise.percentage, 0)
				)
			},
			0
		)

		// Считаем системные доли
		const systemShares =
			(team.project?.equity?.platformShare || 0) +
			(team.project?.equity?.mentorFundShare || 0) +
			(team.project?.equity?.investmentReserve || 0)

		// Общая сумма всех промисов и системных долей
		const totalAllocated = systemShares + (projectPromisesSum || 0) + vacanciesPromisesSum + membersPromisesSum

		// Максимально доступная доля = 100% - общая сумма всех долей
		const maxAvailableShare = 100 - totalAllocated

		return {
			maxAvailableShare,
		}
	}
}

export default createHandler(ApiTeamMaxAvailableShareHandler)
