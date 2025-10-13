import { IsString } from "class-validator";
import {
	createHandler,
	Delete,
	Get,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class InvitationDto {
	@IsString()
	teamInvitationId: string;
}

class CancelInvitationDto {
	@IsString()
	id: string;
}

@NextAuthGuard("user")
class ApiUserTeamInvitationHandler {
	@Get()
	public async getInvitation(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { teamInvitationId }: InvitationDto,
	) {
		const invitation = await prisma.teamInvitation.findUnique({
			where: { id: teamInvitationId },
			include: {
				team: {
					include: {
						project: { select: { id: true, name: true, slug: true } },
					},
				},
				invitedBy: { select: { id: true, name: true, email: true } },
			},
		});

		return invitation;
	}

	@Delete()
	public async cancelInvitation(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { id }: CancelInvitationDto,
	) {
		// Находим приглашение
		const invitation = await prisma.teamInvitation.findUnique({
			where: { id },
			include: {
				team: {
					include: {
						members: {
							where: {
								userId: req.user.id,
							},
						},
					},
				},
			},
		});

		if (!invitation) {
			throw new Error("Invitation not found");
		}

		// Проверяем, что пользователь имеет право отменить приглашение
		// (должен быть основателем команды)
		const isTeamMember = invitation.team.members.some(
			(member: { userId: string }) => member.userId === req.user.id,
		);

		if (!isTeamMember) {
			throw new Error("You do not have permission to cancel this invitation");
		}

		// Удаляем приглашение
		await prisma.teamInvitation.delete({
			where: { id },
		});

		return { success: true };
	}
}

export default createHandler(ApiUserTeamInvitationHandler);
