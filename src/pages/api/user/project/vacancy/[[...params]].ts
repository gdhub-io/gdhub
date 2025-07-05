import { NextAuthGuard } from '@/lib/api-middlewares'
import { NovuService } from '@/services/novu'
import { prisma } from '@/services/prisma'
import { tolgeeService } from '@/services/tolgee'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'
import dayjs from 'dayjs'
import {
	BadRequestException,
	Body,
	Delete,
	Get,
	Post,
	Put,
	Query,
	Req,
	ValidationPipe,
	createHandler,
} from 'next-api-decorators'

class IDParamDto {
	@IsString()
	id: string
}

class UserTeamVacancyCreateDto {
	@IsString()
	title: string
	@IsString()
	description: string
	@IsString()
	directionId: string
	@IsEnum(prismaClient.TeamVacancyStatus)
	status: prismaClient.TeamVacancyStatus
	@IsString()
	@IsOptional()
	publishedAt?: string
	@IsString()
	finishedAt: string
	@IsString()
	teamId: string
	@IsNumber()
	@IsOptional()
	promisePercentage?: number
	@IsString()
	@IsOptional()
	promiseStepId?: string
}

class UserTeamVacancyUpdateDto {
	@IsString()
	@IsOptional()
	title?: string
	@IsString()
	@IsOptional()
	description?: string
	@IsString()
	@IsOptional()
	directionId?: string
	@IsEnum(prismaClient.TeamVacancyStatus)
	@IsOptional()
	status?: prismaClient.TeamVacancyStatus
	@IsString()
	@IsOptional()
	publishedAt?: string
	@IsString()
	@IsOptional()
	finishedAt?: string
	@IsNumber()
	@IsOptional()
	promisePercentage?: number
	@IsString()
	@IsOptional()
	promiseStepId?: string
}

@NextAuthGuard('user')
class ApiUserTeamVacancyHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query() { id }: { id: string }) {
		const data = await prisma.teamVacancy.findFirst({
			where: { id },
			include: {
				promiseStep: true,
				team: {
					select: {
						id: true,
						project: {
							select: {
								id: true,
								name: true,
								slug: true,
								description: true,
								coverImage: true,
								videoLink: true,
								workflow: { select: { steps: { select: { id: true, name: true } } } },
							},
						},
					},
				},
				_count: { select: { applicants: true } },
			},
		})

		const teamMember = await prisma.teamMember.findFirst({ where: { vacancyId: id, userId: req.user.id } })

		return { ...data, myTeamMemberId: teamMember?.id }
	}

	@Post()
	public async create(@Body(ValidationPipe) data: UserTeamVacancyCreateDto) {
		try {
			const { promisePercentage, promiseStepId, ...vacancyData } = data
			const hasEquityPromise = promisePercentage && promiseStepId

			const vacancy = await prisma.teamVacancy.create({
				data: {
					...vacancyData,
					promisePercentage: hasEquityPromise ? promisePercentage : undefined,
					promiseStepId: hasEquityPromise ? promiseStepId : undefined,
				},
			})

			return vacancy
		} catch (error) {
			console.error('[project.create]', error)
			throw error
		}
	}

	@Put()
	public async update(@Query(ValidationPipe) { id }: IDParamDto, @Body(ValidationPipe) data: UserTeamVacancyUpdateDto) {
		const { promisePercentage, promiseStepId, ...vacancyData } = data

		const vacancy = await prisma.teamVacancy.update({
			where: { id },
			data: {
				...vacancyData,
				promisePercentage,
				promiseStepId,
			},
		})

		return vacancy
	}

	@Delete()
	public async delete(@Query(ValidationPipe) { id }: IDParamDto) {
		await prisma.teamVacancy.update({ where: { id }, data: { status: prismaClient.TeamVacancyStatus.Closed } })
	}

	@Put('/withdraw')
	public async withdraw(@Req() req: NextApiRequestWithUser, @Body() { teamMemberId }: { teamMemberId: string }) {
		const { t } = tolgeeService

		const deletedMember = await prisma.teamMember.delete({
			where: { id: teamMemberId },
			select: {
				user: true,
				vacancy: true,
				team: {
					select: {
						members: { where: { status: prismaClient.TeamMemberStatus.Founder }, select: { userId: true, user: true } },
					},
				},
			},
		})

		if (!deletedMember.vacancy) return

		for (const founderMember of deletedMember.team.members) {
			try {
				await NovuService.send({
					template: 'default-message',
					to: {
						subscriberId: founderMember.userId,
						email: founderMember.user.email!,
					},
					payload: {
						title: 'Candidate rejected',
						message: `The candidate ${deletedMember.user.name} rejected his candidacy for the position ${deletedMember.vacancy.title}`,
					},
				})

				console.info('New notification was sent to ' + founderMember.userId)
			} catch (e) {
				console.error('[NovuService]', e)
			}
		}
	}

	@Post('/apply')
	public async apply(
		@Req() req: NextApiRequestWithUser,
		@Body()
		{
			specialityId,
			contactType,
			telegramNickname,
			vacancyId,
		}: { specialityId: string; contactType: string[]; telegramNickname?: string; vacancyId: string }
	) {
		const { t } = tolgeeService

		if (contactType.includes('telegram') && telegramNickname) {
			await prisma.profile.update({ where: { userId: req.user.id }, data: { tgNickname: telegramNickname } })
		}

		const vacancy = await prisma.teamVacancy.findUnique({
			where: { id: vacancyId },
			include: {
				team: { select: { project: { include: { author: true, equity: true } } } },
			},
		})

		const isTeamMember = await prisma.teamMember.findFirst({
			where: { userId: req.user.id, teamId: vacancy?.teamId },
		})

		if (isTeamMember) throw new BadRequestException('You are already a member of this team')

		if (!vacancy || !req.user.id) return

		const candidate = await prisma.teamMember.create({
			data: {
				userId: req.user.id,
				vacancyId,
				teamId: vacancy.teamId,
				position: vacancy.title,
				status: prismaClient.TeamMemberStatus.Applicant,
				specialityId,
				allowedContacts: contactType,
			},
			include: { user: true },
		})

		try {
			await NovuService.send({
				template: 'default-message',
				to: {
					subscriberId: vacancy.team!.project?.authorId!,
					email: vacancy.team!.project?.author.email!,
				},
				payload: {
					title: 'New job response',
					message: `for vacancy "${vacancy.title}" from ${candidate.user.name}`,
					redirectUrl: process.env.NEXT_PUBLIC_APP_URL + '/my/projects/' + vacancy.team!.project?.id,
				},
			})

			console.info('New notification was sent to ' + vacancy.team!.project?.authorId)
		} catch (e) {
			console.error('[NovuService]', e)
		}
	}

	@Put('/candidate/reject')
	public async rejectCandidate(@Body(ValidationPipe) { id }: IDParamDto) {
		const { t } = tolgeeService
		const rejectedCandidate = await prisma.teamMember.update({
			where: { id, status: prismaClient.TeamMemberStatus.Applicant },
			data: { status: prismaClient.TeamMemberStatus.Rejected },
			select: { user: true, vacancy: true, team: true },
		})

		try {
			await NovuService.send({
				template: 'default-message',
				to: {
					subscriberId: rejectedCandidate.user.id,
					email: rejectedCandidate.user.email!,
				},
				payload: {
					title: 'Candidate rejected',
					message: `Your candidacy for a position on the team ${rejectedCandidate.team.name} has been rejected ${rejectedCandidate.vacancy?.title}`,
				},
			})

			console.info('New notification was sent to ' + rejectedCandidate.user.id)
		} catch (e) {
			console.error('[NovuService]', e)
		}
	}

	@Put('/candidate/hire')
	public async hireCandidate(@Body(ValidationPipe) { id }: IDParamDto) {
		const { t } = tolgeeService
		const member = await prisma.teamMember.update({
			where: { id, status: prismaClient.TeamMemberStatus.Applicant },
			data: { status: prismaClient.TeamMemberStatus.Hired, startedAt: dayjs().toISOString() },
			select: { id: true, user: true, team: true, vacancy: true },
		})

		// If vacancy has a promise, create an equity allocation for the member
		const hasEquityPromise = member.vacancy?.promisePercentage && member.vacancy?.promiseStepId

		if (hasEquityPromise) {
			const team = await prisma.team.findUnique({
				where: { id: member.team.id },
				include: { project: { include: { equity: true } } },
			})

			if (team) {
				await prisma.equityAllocation.upsert({
					where: {
						equityId_ownerId: {
							equityId: team.project!.equity!.id,
							ownerId: member.user.id,
						},
					},
					create: {
						equityId: team.project!.equity!.id,
						ownerId: member.user.id,
						teamMemberId: member.id,
						percentage: 0,
						promises: {
							create: {
								percentage: member.vacancy!.promisePercentage!,
								targetStepId: member.vacancy!.promiseStepId!,
								createdById: member.user.id,
							},
						},
					},
					update: {
						teamMemberId: member.id,
						promises: {
							create: {
								percentage: member.vacancy!.promisePercentage!,
								targetStepId: member.vacancy!.promiseStepId!,
								createdById: member.user.id,
							},
						},
					},
				})
			}
		}

		try {
			await NovuService.send({
				template: 'default-message',
				to: {
					subscriberId: member.user.id,
					email: member.user.email!,
				},
				payload: {
					title: 'Accepted into the team',
					message: `You have been accepted into the team ${member.team.name}`,
				},
			})

			console.info('New notification was sent to ' + member.user.id)
		} catch (e) {
			console.error('[NovuService]', e)
		}
	}

	@Put('/candidate/fire')
	public async fireMember(@Body(ValidationPipe) { id }: IDParamDto) {
		const { t } = tolgeeService
		const firedMember = await prisma.teamMember.update({
			where: { id, status: prismaClient.TeamMemberStatus.Hired },
			data: {
				status: prismaClient.TeamMemberStatus.Fired,
				finishedAt: dayjs().toISOString(),
			},
			select: { user: true, team: true },
		})

		// Delete all equity allocations for the fired member
		await prisma.equityPromise.deleteMany({ where: { allocation: { teamMemberId: id } } })
		await prisma.equityAllocation.updateMany({
			where: { teamMemberId: id },
			data: { teamMemberId: { set: null } },
		})

		try {
			await NovuService.send({
				template: 'default-message',
				to: {
					subscriberId: firedMember.user.id,
					email: firedMember.user.email!,
				},
				payload: {
					title: 'Candidate fired',
					message: `You have been kicked off the team ${firedMember.team.name}`,
				},
			})

			console.info('New notification was sent to ' + firedMember.user.id)
		} catch (e) {
			console.error('[NovuService]', e)
		}
	}
}

export default createHandler(ApiUserTeamVacancyHandler)
