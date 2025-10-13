import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import {
	createHandler,
	Get,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class UserTeamDto {
	@IsString()
	teamId: string;

	@IsBoolean()
	@IsOptional()
	isArchive?: boolean;
}

@NextAuthGuard("user")
class ApiUserProjectVacanciesHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { teamId, isArchive = false }: UserTeamDto,
	) {
		const vacancies = await prisma.teamVacancy.findMany({
			where: {
				teamId,
				status: isArchive
					? { equals: prismaClient.TeamVacancyStatus.Closed }
					: { not: prismaClient.TeamVacancyStatus.Closed },
			},
		});

		return vacancies;
	}
}

export default createHandler(ApiUserProjectVacanciesHandler);
