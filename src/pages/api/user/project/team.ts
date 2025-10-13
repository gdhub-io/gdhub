import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsString } from "class-validator";
import { createHandler, Get, Query, ValidationPipe } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class UserTeamDto {
	@IsString()
	teamId: string;
}

@NextAuthGuard("user")
class ApiUserTeamHandler {
	@Get()
	public async get(@Query(ValidationPipe) { teamId }: UserTeamDto) {
		const team = await prisma.team.findUnique({
			where: { id: teamId },
			include: {
				members: {
					where: {
						status: {
							in: [
								prismaClient.TeamMemberStatus.Founder,
								prismaClient.TeamMemberStatus.Hired,
								prismaClient.TeamMemberStatus.Fired,
							],
						},
					},
					orderBy: { createdAt: "asc" },
					include: {
						user: {
							select: {
								name: true,
								image: true,
								profile: { select: { timeForWork: true } },
							},
						},
					},
				},
			},
		});

		return team;
	}
}

export default createHandler(ApiUserTeamHandler);
