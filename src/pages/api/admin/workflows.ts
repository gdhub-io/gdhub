import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createHandler, Get, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiWorkflowsAdminHandler {
	constructor() {}

	@Get()
	public async list(@Req() req: NextApiRequestWithUser) {
		const workflows = await prisma.workflowSchema.findMany();

		return workflows;
	}
}

export default createHandler(ApiWorkflowsAdminHandler);
