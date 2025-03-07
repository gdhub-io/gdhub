import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Get, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user', [prismaClient.UserRole.Admin])
class ApiSeasonsAdminHandler {
	constructor() {}

	@Get()
	public async list(@Req() req: NextApiRequestWithUser) {
		const seasons = await prisma.season.findMany()

		return seasons
	}
}

export default createHandler(ApiSeasonsAdminHandler)
