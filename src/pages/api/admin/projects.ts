import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createHandler, Get } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiAdminProjectsHandler {
	@Get()
	public async list() {
		return prisma.project.findMany({
			select: {
				id: true,
				name: true,
				slug: true,
			},
			orderBy: {
				name: "asc",
			},
		});
	}
}

export default createHandler(ApiAdminProjectsHandler);
