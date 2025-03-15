import { NextAuthGuard } from '@/lib/api-middlewares'
import { NovuService } from '@/services/novu'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsEmail, IsString, IsOptional, IsDateString } from 'class-validator'
import { Body, Post, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class InviteMemberDto {
	@IsString()
	teamId: string

	@IsEmail()
	email: string

	@IsString()
	position: string

	@IsString()
	directionId: string

	@IsDateString()
	@IsOptional()
	startedAt?: string
}

@NextAuthGuard('user')
class ApiUserTeamInviteHandler {
	@Post()
	public async invite(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: InviteMemberDto) {
		try {
			// Проверяем, существует ли команда
			const team = await prisma.team.findUnique({
				where: { id: data.teamId },
				include: {
					project: { select: { id: true, name: true, slug: true } },
				},
			})

			if (!team) {
				throw new Error('Team not found')
			}

			// Проверяем, является ли текущий пользователь основателем команды
			const isFounder = await prisma.teamMember.findFirst({
				where: {
					teamId: data.teamId,
					userId: req.user.id,
					status: prismaClient.TeamMemberStatus.Founder,
				},
			})

			if (!isFounder) {
				throw new Error('Only team founder can invite members')
			}

			// Проверяем, существует ли пользователь с указанным email
			let user = await prisma.user.findUnique({
				where: { email: data.email },
			})

			// Если пользователь не найден, создаем запись приглашения
			if (!user) {
				// CСоздаем запись приглашения в базе данных
				const invitation = await prisma.teamInvitation.create({
					data: {
						email: data.email,
						position: data.position,
						directionId: data.directionId,
						startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
						team: { connect: { id: data.teamId } },
						invitedBy: { connect: { id: req.user.id } },
						status: prismaClient.InvitationStatus.Pending,
						expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Приглашение действительно 7 дней
					},
				})

				// Отправляем email с приглашением через Novu
				try {
					await NovuService.send({
						template: 'team-invitation',
						to: {
							subscriberId: data.email,
							email: data.email,
						},
						payload: {
							invitationId: invitation.id,
							teamName: team.name || 'Team',
							projectName: team.project?.name || 'Project',
							projectSlug: team.project?.slug || '',
							position: data.position,
							startedAt: data.startedAt || new Date().toISOString(),
							inviterName: req.user.name || 'Project founder',
							acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/user/project/team/accept-invite?token=${invitation.id}`,
						},
					})
				} catch (error) {
					console.error('Failed to send invitation email:', error)
					// Продолжаем выполнение даже если отправка письма не удалась
				}

				return { success: true, message: 'Invitation sent' }
			}

			// Проверяем, не является ли пользователь уже членом команды
			const existingMember = await prisma.teamMember.findFirst({
				where: {
					teamId: data.teamId,
					userId: user.id,
					status: {
						in: [prismaClient.TeamMemberStatus.Hired, prismaClient.TeamMemberStatus.Founder],
					},
				},
			})

			if (existingMember) {
				throw new Error('User is already a member of this team')
			}

			// Create an invitation record for existing user
			const invitation = await prisma.teamInvitation.create({
				data: {
					email: data.email,
					position: data.position,
					directionId: data.directionId,
					startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
					team: { connect: { id: data.teamId } },
					invitedBy: { connect: { id: req.user.id } },
					user: { connect: { id: user.id } },
					status: prismaClient.InvitationStatus.Pending,
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Приглашение действительно 7 дней
				},
			})

			// Отправляем уведомление пользователю через Novu
			try {
				await NovuService.send({
					template: 'team-invitation',
					to: {
						subscriberId: user.id,
						email: user.email!,
					},
					payload: {
						invitationId: invitation.id,
						teamName: team.name || 'Team',
						projectName: team.project?.name || 'Project',
						projectSlug: team.project?.slug || '',
						position: data.position,
						startedAt: data.startedAt || new Date().toISOString(),
						inviterName: req.user.name || 'Project founder',
						acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/user/project/team/accept-invite?token=${invitation.id}`,
					},
				})
			} catch (error) {
				console.error('Failed to send invitation email:', error)
				// Продолжаем выполнение даже если отправка письма не удалась
			}

			return { success: true, message: 'Invitation sent to existing user' }
		} catch (error: any) {
			console.error('[team.invite]', error)
			throw error
		}
	}
}

export default createHandler(ApiUserTeamInviteHandler)
