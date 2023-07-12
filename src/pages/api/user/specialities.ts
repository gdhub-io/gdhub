import { Get, Req, createHandler } from 'next-api-decorators'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'

@NextAuthGuard('user')
class ApiSpecialitiesHandler {
	constructor() {}

	@Get()
	public async list(@Req() req: NextApiRequestWithUser) {
		const specialities = await prisma.speciality.findMany({
			where: { userId: req.user.id },
			include: { direction: true },
		})

		return specialities
	}
}

export default createHandler(ApiSpecialitiesHandler)
