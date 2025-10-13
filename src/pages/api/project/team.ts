import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsString } from "class-validator";
import { createHandler, Get, Query, ValidationPipe } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class UserTeamDto {
	@IsString()
	teamId: string;
}

class ApiUserTeamHandler {
	@Get()
	public async get(@Query(ValidationPipe) { teamId }: UserTeamDto) {
		const team = await prisma.team.findFirst({
			where: { id: teamId },
			include: {
				members: {
					where: {
						status: {
							in: [
								prismaClient.TeamMemberStatus.Hired,
								prismaClient.TeamMemberStatus.Founder,
							],
						},
					},
					include: { user: { select: { name: true, image: true } } },
				},
			},
		});

		return team;
	}
}

export default createHandler(ApiUserTeamHandler);
