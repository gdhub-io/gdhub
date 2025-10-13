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
import { prisma } from "@/services/prisma";

class UserTeamCandidatesDto {
	@IsString()
	teamId: string;
}

@NextAuthGuard("user")
class ApiTeamCandidatesHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { teamId }: UserTeamCandidatesDto,
	) {
		const applicants = await prisma.teamMember.findMany({
			where: {
				teamId,
				status: { equals: prismaClient.TeamMemberStatus.Applicant },
			},
			include: {
				user: {
					select: {
						id: true,
						email: true,
						name: true,
						image: true,
						specialities: { select: { id: true, name: true } },
						profile: {
							include: {
								preferredGenres: true,
								preferredLevels: true,
								preferredSettings: true,
							},
						},
					},
				},
				vacancy: true,
				speciality: true,
			},
		});

		return applicants;
	}
}

export default createHandler(ApiTeamCandidatesHandler);
