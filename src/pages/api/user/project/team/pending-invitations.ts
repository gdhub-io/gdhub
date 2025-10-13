import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsString } from "class-validator";
import { createHandler, Get, Query, ValidationPipe } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class TeamPendingInvitationsDto {
	@IsString()
	teamId: string;
}

@NextAuthGuard("user")
class ApiUserTeamPendingInvitationsHandler {
	@Get()
	public async getPendingInvitations(
		@Query(ValidationPipe) { teamId }: TeamPendingInvitationsDto,
	) {
		// Получаем все приглашения команды со статусом Pending
		const pendingInvitations = await prisma.teamInvitation.findMany({
			where: {
				teamId,
				status: prismaClient.InvitationStatus.Pending,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return pendingInvitations;
	}
}

export default createHandler(ApiUserTeamPendingInvitationsHandler);
