import { createHmac } from 'crypto'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { Get, Req, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiServiceNovuHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser) {
		const signature = createHmac('sha256', process.env.NOVU_API_SECRET as string)
			.update(req.user.id as string)
			.digest('hex')

		return { signature }
	}
}

export default createHandler(ApiServiceNovuHandler)
