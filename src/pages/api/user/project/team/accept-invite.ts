import { NextAuthGuard } from '@/lib/api-middlewares'
import { NovuService } from '@/services/novu'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class AcceptInviteDto {
	@IsString()
	token: string
}

@NextAuthGuard('user')
class ApiUserTeamAcceptInviteHandler {
	@Get()
	public async acceptInvite(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { token }: AcceptInviteDto) {
		try {
			// Находим приглашение по токену (ID приглашения)
			const invitation = await prisma.teamInvitation.findUnique({
				where: { id: token },
				include: {
					team: {
						include: {
							project: { select: { id: true, name: true, slug: true } },
						},
					},
					invitedBy: { select: { id: true, name: true, email: true } },
				},
			})

			if (!invitation) {
				throw new Error('Invitation not found')
			}

			// Проверяем, не истек ли срок действия приглашения
			if (invitation.expiresAt && new Date() > invitation.expiresAt) {
				throw new Error('Invitation has expired')
			}

			// Проверяем, не принято ли уже приглашение
			if (invitation.status === prismaClient.InvitationStatus.Accepted) {
				throw new Error('Invitation has already been accepted')
			}

			// Проверяем, что приглашение адресовано текущему пользователю
			if (invitation.email !== req.user.email && (!invitation.userId || invitation.userId !== req.user.id)) {
				throw new Error('This invitation is not for you')
			}

			// Проверяем, прошел ли пользователь onboarding
			const user = await prisma.user.findUnique({
				where: { id: req.user.id },
				include: { profile: true, specialities: true },
			})

			if (!user) {
				throw new Error('User not found')
			}

			// Обновляем статус приглашения на "ACCEPTED"
			await prisma.teamInvitation.update({
				where: { id: token },
				data: {
					status: prismaClient.InvitationStatus.Accepted,
					acceptedAt: new Date(),
					user: { connect: { id: req.user.id } },
				},
			})

			// Проверяем, завершил ли пользователь onboarding
			const hasCompletedOnboarding = user.onboardingDone

			// Проверяем, есть ли у пользователя хотя бы одна специализация
			const hasSpeciality =
				user.specialities &&
				user.specialities.filter((speciality) => speciality.workDirectionId === invitation.directionId).length > 0

			// Если пользователь не завершил onboarding или не имеет специализации,
			// сохраняем информацию о приглашении для последующего добавления в команду
			if (!hasCompletedOnboarding || !hasSpeciality) {
				// Сохраняем информацию о приглашении в профиле пользователя
				await prisma.user.update({
					where: { id: req.user.id },
					data: {
						pendingTeamInvitations: {
							push: {
								invitationId: invitation.id,
								teamId: invitation.teamId,
								position: invitation.position,
								directionId: invitation.directionId,
								startedAt: invitation.startedAt,
							},
						},
					},
				})

				// Отправляем уведомление пользователю, отправившему приглашение
				try {
					await NovuService.send({
						template: 'invitation-accepted-pending',
						to: {
							subscriberId: invitation.invitedBy.id,
							email: invitation.invitedBy.email || undefined,
						},
						payload: {
							invitationId: invitation.id,
							teamName: invitation.team.name || 'Team',
							projectName: invitation.team.project?.name || 'Project',
							projectSlug: invitation.team.project?.slug || '',
							position: invitation.position,
							memberName: req.user.name || 'New member',
							memberEmail: req.user.email,
							pendingReason: !hasCompletedOnboarding ? 'onboarding' : 'speciality',
						},
					})
				} catch (error) {
					console.error('Failed to send notification to inviter:', error)
					// Продолжаем выполнение даже если отправка уведомления не удалась
				}

				// Перенаправляем пользователя на страницу onboarding или создания специализации
				if (!hasCompletedOnboarding) {
					return {
						success: true,
						message: 'You need to complete onboarding before joining the team',
						redirect: `/registration/onboarding?pendingInvitation=${invitation.id}`,
					}
				} else {
					return {
						success: true,
						message: 'You need to create a speciality before joining the team',
						redirect: `/profile/settings/specialities?pendingInvitation=${invitation.id}`,
					}
				}
			}

			// Если пользователь завершил onboarding и имеет специализацию, добавляем его в команду
			const teamMember = await prisma.teamMember.create({
				data: {
					position: invitation.position,
					speciality: { connect: { id: user.specialities[0].id } },
					status: prismaClient.TeamMemberStatus.Hired,
					startedAt: invitation.startedAt,
					team: { connect: { id: invitation.teamId } },
					user: { connect: { id: req.user.id } },
				},
			})

			// Отправляем уведомление пользователю, отправившему приглашение
			try {
				await NovuService.send({
					template: 'invitation-accepted',
					to: {
						subscriberId: invitation.invitedBy.id,
						email: invitation.invitedBy.email || undefined,
					},
					payload: {
						teamMemberId: teamMember.id,
						teamName: invitation.team.name || 'Team',
						projectName: invitation.team.project?.name || 'Project',
						projectSlug: invitation.team.project?.slug || '',
						position: invitation.position,
						memberName: req.user.name || 'New member',
						memberEmail: req.user.email,
					},
				})
			} catch (error) {
				console.error('Failed to send notification to inviter:', error)
				// Продолжаем выполнение даже если отправка уведомления не удалась
			}

			// Перенаправляем пользователя на страницу проекта
			return {
				success: true,
				message: 'You have successfully joined the team',
				redirect: `/my/projects/${invitation.team.project?.slug || invitation.team.project?.id}`,
			}
		} catch (error: any) {
			console.error('[team.accept-invite]', error)
			throw error
		}
	}
}

export default createHandler(ApiUserTeamAcceptInviteHandler)
