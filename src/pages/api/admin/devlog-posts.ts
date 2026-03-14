import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsOptional, IsString } from "class-validator";
import { createHandler, Get, Query, ValidationPipe } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class AdminDevlogPostsQueryDto {
	@IsString()
	@IsOptional()
	projectId?: string;
}

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiAdminDevlogPostsHandler {
	@Get()
	public async list(
		@Query(ValidationPipe) { projectId }: AdminDevlogPostsQueryDto,
	) {
		return prisma.projectReport.findMany({
			where: projectId
				? {
						projectId,
					}
				: undefined,
			orderBy: {
				publishedAt: "desc",
			},
			include: {
				project: {
					select: {
						id: true,
						name: true,
						slug: true,
						coverImage: true,
					},
				},
				author: {
					select: {
						id: true,
						name: true,
						image: true,
					},
				},
			},
		});
	}
}

export default createHandler(ApiAdminDevlogPostsHandler);
