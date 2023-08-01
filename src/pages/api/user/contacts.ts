import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Get, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiUserContactsHandler {
	constructor() {}

	@Get()
	public async contacts(@Req() req: NextApiRequestWithUser) {
		const profile = await prisma.profile.findFirst({
			where: { userId: req.user.id },
			select: { tgNickname: true, user: { select: { email: true } } },
		})

		return {
			email: profile?.user.email,
			telegram: profile?.tgNickname,
		}
	}
}

export default createHandler(ApiUserContactsHandler)
