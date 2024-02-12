import { NextAuthGuard } from '@/lib/api-middlewares'
import { NovuService } from '@/services/novu'
import { prisma } from '@/services/prisma'
import { TeamMemberStatus, TeamVacancyStatus } from '@prisma/client'
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
	@IsEnum(TeamVacancyStatus)
	status: TeamVacancyStatus
	@IsString()
	@IsOptional()
	publishedAt?: string
	@IsString()
	finishedAt: string
	@IsString()
	teamId: string
	@IsString()
	projectId: string
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
	@IsEnum(TeamVacancyStatus)
	@IsOptional()
	status?: TeamVacancyStatus
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
					},
				},
				project: {
					select: {
						id: true,
						name: true,
						slug: true,
						stage: { select: { name: true, season: { select: { id: true, name: true } } } },
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
		await prisma.teamVacancy.create({ data })
	}

	@Put()
	public async update(@Query(ValidationPipe) { id }: IDParamDto, @Body(ValidationPipe) data: UserTeamVacancyUpdateDto) {
		await prisma.teamVacancy.update({ where: { id }, data })
	}

	@Delete()
	public async delete(@Query(ValidationPipe) { id }: IDParamDto) {
		await prisma.teamVacancy.update({ where: { id }, data: { status: TeamVacancyStatus.Closed } })
	}

	@Put('/withdraw')
	public async withdraw(@Req() req: NextApiRequestWithUser, @Body() { teamMemberId }: { teamMemberId: string }) {
		const deletedMember = await prisma.teamMember.delete({
			where: { id: teamMemberId },
			select: {
				user: true,
				vacancy: true,
				team: {
					select: { members: { where: { status: TeamMemberStatus.Founder }, select: { userId: true, user: true } } },
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
						message: `Кандидат ${deletedMember.user.name} отклонил свою кандидатуру на позицию ${deletedMember.vacancy.title}`,
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
		if (contactType.includes('telegram') && telegramNickname) {
			await prisma.profile.update({ where: { userId: req.user.id }, data: { tgNickname: telegramNickname } })
		}

		const vacancy = await prisma.teamVacancy.findUnique({
			where: { id: vacancyId },
			include: { project: { include: { author: true } } },
		})

		if (!vacancy || !req.user.id) return

		const candidate = await prisma.teamMember.create({
			data: {
				userId: req.user.id,
				vacancyId,
				teamId: vacancy.teamId,
				position: vacancy.title,
				status: TeamMemberStatus.Applicant,
				specialityId,
				allowedContacts: contactType,
			},
			include: { user: true },
		})

		try {
			await NovuService.send({
				template: 'new-candidate-to-project',
				to: {
					subscriberId: vacancy.project.authorId!,
					email: vacancy.project?.author.email!,
				},
				payload: {
					name: candidate.user.name,
					vacancy: vacancy.title,
					project: vacancy.project?.name,
					url: process.env.NEXT_PUBLIC_APP_URI + '/my/projects/' + vacancy.project?.id,
				},
			})

			console.info('New notification was sent to ' + vacancy.project?.authorId)
		} catch (e) {
			console.error('[NovuService]', e)
		}
	}

	@Put('/candidate/reject')
	public async rejectCandidate(@Body(ValidationPipe) { id }: IDParamDto) {
		const rejectedCandidate = await prisma.teamMember.update({
			where: { id, status: TeamMemberStatus.Applicant },
			data: { status: TeamMemberStatus.Rejected },
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
					message: `Ваша кандидатура на позицию ${rejectedCandidate.vacancy?.title} в команде ${rejectedCandidate.team.name} была отклонена.`,
				},
			})

			console.info('New notification was sent to ' + rejectedCandidate.user.id)
		} catch (e) {
			console.error('[NovuService]', e)
		}
	}

	@Put('/candidate/hire')
	public async hireCandidate(@Body(ValidationPipe) { id }: IDParamDto) {
		const member = await prisma.teamMember.update({
			where: { id, status: TeamMemberStatus.Applicant },
			data: { status: TeamMemberStatus.Hired, startedAt: dayjs().toISOString() },
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
					message: `Вы приняты в команду ${member.team.name}`,
				},
			})

			console.info('New notification was sent to ' + member.user.id)
		} catch (e) {
			console.error('[NovuService]', e)
		}
	}

	@Put('/candidate/fire')
	public async fireMember(@Body(ValidationPipe) { id }: IDParamDto) {
		const firedMember = await prisma.teamMember.update({
			where: { id, status: TeamMemberStatus.Hired },
			data: { status: TeamMemberStatus.Fired, finishedAt: dayjs().toISOString() },
			select: { user: true, team: true },
		})

		try {
			await NovuService.send({
				template: 'default-message',
				to: {
					subscriberId: firedMember.user.id,
					email: firedMember.user.email!,
				},
				payload: {
					message: `Вы были исключены из команды ${firedMember.team.name}`,
				},
			})

			console.info('New notification was sent to ' + firedMember.user.id)
		} catch (e) {
			console.error('[NovuService]', e)
		}
	}
}

export default createHandler(ApiUserTeamVacancyHandler)
