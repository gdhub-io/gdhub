import { IsString } from "class-validator";
import { createHandler, Get, Query, ValidationPipe } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class InvitationTokenDto {
	@IsString()
	token: string;
}

@NextAuthGuard("user")
class ApiInvitationHandler {
	@Get()
	public async getInvitation(
		@Query(ValidationPipe) { token }: InvitationTokenDto,
	) {
		try {
			const invitation = await prisma.teamInvitation.findUnique({
				where: { id: token },
				include: {
					team: {
						select: {
							id: true,
							name: true,
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

			return invitation;
		} catch (error: any) {
			console.error("[invitation.get]", error);
			throw error;
		}
	}
}

export default createHandler(ApiInvitationHandler);
