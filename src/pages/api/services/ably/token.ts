import { NextAuthGuard } from '@/lib/api-middlewares'
import Ably from 'ably'
import type { NextApiResponse } from 'next'
import { createHandler, Get, Req } from 'next-api-decorators'

@NextAuthGuard('user')
class AblyTokenHandler {
	@Get()
	async getToken(@Req() req: NextApiRequestWithUser, res: NextApiResponse) {
		const key = process.env.ABLY_API_KEY

		if (!key) {
			res.status(500).json({ error: 'ABLY_API_KEY not set' })
			return
		}

		const client = new Ably.Rest({ key })
		const tokenRequest = await client.auth.createTokenRequest({ clientId: req.user.id })

		// Return raw TokenRequest per Ably expectations
		return tokenRequest
	}
}

export default createHandler(AblyTokenHandler)
