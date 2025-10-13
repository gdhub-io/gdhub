import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsString } from "class-validator";
import { createHandler, Get, Query } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class ParamsDto {
	@IsString()
	lectureId: string;
}

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiSeasonStagesAdminHandler {
	constructor() {}

	@Get()
	public async list(@Query() { lectureId }: ParamsDto) {
		const stages = await prisma.lecturerRequest.findMany({
			where: { lectureId },
			orderBy: { createdAt: "asc" },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						image: true,
						specialities: { select: { id: true, name: true } },
					},
				},
			},
		});

		return stages;
	}
}

export default createHandler(ApiSeasonStagesAdminHandler);
