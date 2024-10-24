import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Get, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user', [prismaClient.UserRole.Admin])
class ApiLecturesAdminHandler {
	constructor() {}

	@Get()
	public async list(@Req() req: NextApiRequestWithUser) {
		const seasons = await prisma.lecture.findMany({
			include: {
				_count: { select: { lecturerRequests: true, listeners: true } },
				lecturerRequests: {
					where: { isSpeaker: true },
					include: { user: { select: { id: true, name: true, image: true } } },
				},
			},
		})

		return seasons
	}
}

export default createHandler(ApiLecturesAdminHandler)
