import { IsString } from "class-validator";
import { createHandler, Get, Query, ValidationPipe } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class ParamIdDto {
	@IsString()
	id: string;
}

@NextAuthGuard("user")
class ApiUserTeamCandidateHandler {
	@Get()
	public async get(@Query(ValidationPipe) { id }: ParamIdDto) {
		const _teamMember = await prisma.teamMember.findUnique({
			where: { id },
		});

		const teamMember = await prisma.teamMember.findUnique({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: _teamMember?.allowedContacts.includes("email") == true,
						image: true,
						profile: {
							include: {
								preferredGenres: true,
								preferredLevels: true,
								preferredSettings: true,
							},
						},
					},
				},
				team: { select: { project: true } },
				vacancy: true,
				speciality: true,
			},
		});

		return teamMember;
	}
}

export default createHandler(ApiUserTeamCandidateHandler);
