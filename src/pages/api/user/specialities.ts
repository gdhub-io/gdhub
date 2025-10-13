import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createHandler, Get, Query, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user")
class ApiSpecialitiesHandler {
	constructor() {}

	@Get()
	public async list(
		@Req() req: NextApiRequestWithUser,
		@Query("level") level: prismaClient.$Enums.SkillLevel[],
	) {
		const specialities = await prisma.speciality.findMany({
			where: { userId: req.user.id, level: level ? { in: level } : undefined },
			include: { direction: true },
			orderBy: { createdAt: "desc" },
		});

		return specialities;
	}
}

export default createHandler(ApiSpecialitiesHandler);
