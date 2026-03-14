import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createHandler, Delete, Param } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiAdminDevlogPostHandler {
	@Delete("/:id")
	public async delete(@Param("id") id: string) {
		await prisma.projectReport.delete({
			where: { id },
		});

		return { success: true };
	}
}

export default createHandler(ApiAdminDevlogPostHandler);
