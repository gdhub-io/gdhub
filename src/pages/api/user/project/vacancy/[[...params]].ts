import { NextAuthGuard } from '@/lib/api-middlewares'
import { NovuService } from '@/services/novu'
import { prisma } from '@/services/prisma'
import { tolgeeService } from '@/services/tolgee'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import dayjs from 'dayjs'
import { Body, Delete, Get, Post, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

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
}

@NextAuthGuard('user')
class ApiUserTeamVacancyHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query() { id }: { id: string }) {
		const data = await prisma.teamVacancy.findFirst({
			where: { id },
			include: {
				team: {
					select: {
						id: true,
						project: {
							select: {
								id: true,
								name: true,
								slug: true,
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
			await prisma.teamVacancy.create({ data })
		} catch (error) {
			console.error('[project.create]', error)
			throw error
		}
	}

	@Put()
	public async update(@Query(ValidationPipe) { id }: IDParamDto, @Body(ValidationPipe) data: UserTeamVacancyUpdateDto) {
		await prisma.teamVacancy.update({ where: { id }, data })
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
						message: t(
							'send-message.novu.candidate-reject',
							'The candidate {candidateName} rejected his candidacy for the position {vacancyName}',
							{ candidateName: deletedMember.user.name, vacancyName: deletedMember.vacancy.title }
						),
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
			include: { team: { select: { project: { include: { author: true } } } } },
		})

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
					title: t('message.new-job-response.title', 'New job response to the {project}', {
						project: vacancy.team!.project?.name,
					}),
					message: t('message.new-job-response.content', `for vacancy "{vacancy}" from {name}`, {
						name: candidate.user.name,
						vacancy: vacancy.title,
					}),
					redirectUrl: process.env.NEXT_PUBLIC_APP_URI + '/my/projects/' + vacancy.team!.project?.id,
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
					message: t(
						'send-message.novu.your-candidacy-reject',
						'Your candidacy for a position on the team {teamName} has been rejected {vacancyName}',
						{ teamName: rejectedCandidate.team.name, vacancyName: rejectedCandidate.vacancy?.title }
					),
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
			select: { user: true, team: true },
		})

		try {
			await NovuService.send({
				template: 'default-message',
				to: {
					subscriberId: member.user.id,
					email: member.user.email!,
				},
				payload: {
					message: t('send-message.novu.your-candidacy-approve', `You have been accepted into the team {memberName}`, {
						memberName: member.team.name,
					}),
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

		try {
			await NovuService.send({
				template: 'default-message',
				to: {
					subscriberId: firedMember.user.id,
					email: firedMember.user.email!,
				},
				payload: {
					message: t('', `You have been kicked off the team {firedMemberName}`, { firedMember: firedMember.team.name }),
				},
			})

			console.info('New notification was sent to ' + firedMember.user.id)
		} catch (e) {
			console.error('[NovuService]', e)
		}
	}
}

export default createHandler(ApiUserTeamVacancyHandler)
