import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsString } from "class-validator";
import {
	createHandler,
	Get,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { createProjectLegalEvent } from "@/helpers/legal/projectLegalPersistence";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

class CompletePendingInvitationDto {
	@IsString()
	invitationId: string;
}

@NextAuthGuard("user")
class ApiUserTeamCompletePendingInvitationHandler {
	@Get()
	public async completePendingInvitation(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { invitationId }: CompletePendingInvitationDto,
	) {
		try {
			// Получаем информацию о пользователе
			const user = await prisma.user.findUnique({
				where: { id: req.user.id },
				include: { specialities: true },
			});

			if (!user) {
				throw new Error("User not found");
			}

			// Проверяем, завершил ли пользователь onboarding
			if (!user.onboardingDone) {
				throw new Error("You need to complete onboarding first");
			}

			// Проверяем, есть ли у пользователя хотя бы одна специализация
			if (!user.specialities || user.specialities.length === 0) {
				throw new Error("You need to create a speciality first");
			}

			// Получаем информацию о приглашении
			const invitation = await prisma.teamInvitation.findUnique({
				where: { id: invitationId },
				include: {
					team: {
						include: {
							project: { select: { id: true, name: true, slug: true } },
						},
					},
					invitedBy: { select: { id: true, name: true, email: true } },
				},
			});

			if (!invitation) {
				throw new Error("Invitation not found");
			}

			// Проверяем, что приглашение адресовано текущему пользователю
			if (
				invitation.email !== req.user.email &&
				(!invitation.userId || invitation.userId !== req.user.id)
			) {
				throw new Error("This invitation is not for you");
			}

			// Проверяем, что приглашение принято
			if (invitation.status !== prismaClient.InvitationStatus.Accepted) {
				throw new Error("Invitation has not been accepted");
			}
			// Находим информацию о приглашении в pendingTeamInvitations пользователя
			const pendingInvitation = user.pendingTeamInvitations?.find(
				(inv: any) => inv.invitationId === invitationId,
			) as Record<string, any>;

			if (!pendingInvitation) {
				throw new Error("Pending invitation not found");
			}

			const neededSpeciality = user?.specialities.find(
				(s: { workDirectionId: string }) =>
					s.workDirectionId === pendingInvitation.directionId,
			);

			if (!neededSpeciality) {
				throw new Error("Speciality not found");
			}

			// Добавляем пользователя в команду
			const teamMember = await prisma.teamMember.create({
				data: {
					position: pendingInvitation.position,
					status: prismaClient.TeamMemberStatus.Hired,
					startedAt: new Date(pendingInvitation.startedAt),
					speciality: {
						connect: { id: neededSpeciality.id },
					},
					team: { connect: { id: pendingInvitation.teamId } },
					user: { connect: { id: req.user.id } },
				},
			});

			if (invitation.team.project?.id) {
				await createProjectLegalEvent({
					projectId: invitation.team.project.id,
					actorUserId: req.user.id,
					subjectUserId: req.user.id,
					subjectTeamMemberId: teamMember.id,
					type: "MemberJoined",
					effectiveAt: teamMember.startedAt,
					payload: {
						joinMethod: "pending-team-invitation",
						position: pendingInvitation.position,
					},
				});
			}

			// Удаляем информацию о приглашении из pendingTeamInvitations пользователя
			const updatedPendingInvitations = user.pendingTeamInvitations.filter(
				(inv: any) => inv.invitationId !== invitationId,
			);

			await prisma.user.update({
				where: { id: req.user.id },
				data: {
					pendingTeamInvitations:
						updatedPendingInvitations as prismaClient.Prisma.InputJsonValue[],
				},
			});

			// Отправляем уведомление пользователю, отправившему приглашение
			try {
				await NovuService.send({
					template: "invitation-completed",
					to: {
						subscriberId: invitation.invitedBy.id,
						email: invitation.invitedBy.email || undefined,
					},
					payload: {
						teamMemberId: teamMember.id,
						teamName: invitation.team.name || "Team",
						projectName: invitation.team.project?.name || "Project",
						projectSlug: invitation.team.project?.slug || "",
						position: pendingInvitation.position,
						memberName: req.user.name || "New member",
						memberEmail: req.user.email,
					},
				});
			} catch (error) {
				console.error("Failed to send notification to inviter:", error);
				// Продолжаем выполнение даже если отправка уведомления не удалась
			}

			// Перенаправляем пользователя на страницу проекта
			return {
				success: true,
				message: "You have successfully joined the team",
				redirect: `/my/projects/${invitation.team.project?.slug || invitation.team.project?.id}`,
			};
		} catch (error: any) {
			console.error("[team.complete-pending-invitation]", error);
			throw error;
		}
	}
}

export default createHandler(ApiUserTeamCompletePendingInvitationHandler);
