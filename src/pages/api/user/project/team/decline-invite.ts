import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsString } from "class-validator";
import {
	createHandler,
	Get,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

class DeclineInviteDto {
	@IsString()
	token: string;
}

@NextAuthGuard("user")
class ApiUserTeamDeclineInviteHandler {
	@Get()
	public async declineInvite(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { token }: DeclineInviteDto,
	) {
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
			});

			if (!invitation) {
				throw new Error("Invitation not found");
			}

			// Проверяем, не истек ли срок действия приглашения
			if (invitation.expiresAt && new Date() > invitation.expiresAt) {
				throw new Error("Invitation has expired");
			}

			// Проверяем, что приглашение адресовано текущему пользователю
			if (
				invitation.email !== req.user.email &&
				(!invitation.userId || invitation.userId !== req.user.id)
			) {
				throw new Error("This invitation is not for you");
			}

			// Обновляем статус приглашения на "DECLINED"
			await prisma.teamInvitation.update({
				where: { id: token },
				data: {
					status: prismaClient.InvitationStatus.Declined,
				},
			});

			// Отправляем уведомление пользователю, отправившему приглашение
			try {
				await NovuService.send({
					template: "invitation-declined",
					to: {
						subscriberId: invitation.invitedBy.id,
						email: invitation.invitedBy.email || undefined,
					},
					payload: {
						teamName: invitation.team.name || "Team",
						projectName: invitation.team.project?.name || "Project",
						projectSlug: invitation.team.project?.slug || "",
						position: invitation.position,
						memberName: req.user.name || "User",
						memberEmail: req.user.email,
					},
				});
			} catch (error) {
				console.error("Failed to send notification to inviter:", error);
				// Продолжаем выполнение даже если отправка уведомления не удалась
			}

			return { success: true, message: "Invitation declined" };
		} catch (error: any) {
			console.error("[team.decline-invite]", error);
			throw error;
		}
	}
}

export default createHandler(ApiUserTeamDeclineInviteHandler);
