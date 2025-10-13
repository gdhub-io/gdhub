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

class ProjectVacancyParams {
	@IsString()
	id: string;
}

@NextAuthGuard("any")
class ApiProjectVacancyHandler {
	constructor() {}

	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { id }: ProjectVacancyParams,
	) {
		const data = await prisma.teamVacancy.findFirst({
			where: { id },
			include: {
				promiseStep: true,
				team: {
					select: {
						id: true,
						project: {
							select: {
								id: true,
								name: true,
								slug: true,
								description: true,
								coverImage: true,
								videoLink: true,
								workflow: {
									select: { steps: { select: { id: true, name: true } } },
								},
							},
						},
					},
				},
				_count: { select: { applicants: true } },
			},
		});

		let teamMember = null;

		if (req?.user?.id) {
			teamMember = await prisma.teamMember.findFirst({
				where: { vacancyId: id, userId: req.user.id },
			});
		}

		return { ...data, myTeamMemberId: teamMember?.id };
	}
}

export default createHandler(ApiProjectVacancyHandler);
