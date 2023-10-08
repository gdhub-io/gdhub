import { User } from '@prisma/client'
import { type NextApiRequest } from 'next'

declare global {
	type NextApiRequestWithUser = NextApiRequest & { user: Partial<User> }

	type AuthUser = {
		email: string
		username: string
		avatar?: string
		discordId: number
		id: string | null
		firstName?: string
		lastName?: string
		country?: string
		access_token?: string
	}
}

declare global {
	interface Window {
		$crisp?: any
	}
}
