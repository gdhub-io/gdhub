import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsEnum, IsString } from "class-validator";
import { Body, createHandler, Put, ValidationPipe } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class ApiProjectMoveDto {
	@IsString()
	projectId: string;

	@IsEnum(prismaClient.ProjectStatus)
	newStatus: prismaClient.ProjectStatus;
}

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiProjectMoveHandler {
	@Put()
	public async changeStatus(
		@Body(ValidationPipe) { projectId, newStatus }: ApiProjectMoveDto,
	) {
		await prisma.project.update({
			where: { id: projectId },
			data: { status: newStatus },
		});
	}
}

export default createHandler(ApiProjectMoveHandler);
