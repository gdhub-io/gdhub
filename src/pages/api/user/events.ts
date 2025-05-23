import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Get, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiUserEventsHandler {
	constructor() {}

	@Get()
	public async events(@Req() req: NextApiRequestWithUser) {
		const events = await prisma.event.findMany({
			where: {
				createdById: req.user.id,
			},
			include: {
				schedule: {
					include: {
						speakers: true,
					},
				},
			},
		})

		return events
	}
}

export default createHandler(ApiUserEventsHandler)
