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

class ParamIdDto {
	@IsString()
	id: string;
}

@NextAuthGuard("user")
class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { id }: ParamIdDto,
	) {
		const isAdmin = req.user.roles?.includes(prismaClient.UserRole.Admin);
		const activeSubscription = await prisma.user.activeSubscription(
			req.user.id!,
		);

		const specialist = await prisma.speciality.findFirst({
			where: { id },
			include: {
				user: {
					select: {
						name: true,
						image: true,
						email: true,
						profile: {
							include: {
								preferredGenres: true,
								preferredLevels: true,
								preferredSettings: true,
							},
						},
					},
				},
				direction: true,
				// paid data
				availableProjects: activeSubscription
					? {
							where: !isAdmin
								? { project: { authorId: req.user.id } }
								: undefined,
							include: { project: { select: { name: true } } },
						}
					: undefined,
			},
		});

		return specialist;
	}
}

export default createHandler(ApiSpecialistHandler);
