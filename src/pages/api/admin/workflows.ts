import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Get, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user', [prismaClient.UserRole.Admin])
class ApiWorkflowsAdminHandler {
	constructor() {}

	@Get()
	public async list(@Req() req: NextApiRequestWithUser) {
		const workflows = await prisma.workflowSchema.findMany()

		return workflows
	}
}

export default createHandler(ApiWorkflowsAdminHandler)
