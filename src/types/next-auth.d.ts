import 'next-auth/jwt'
import { UserRole } from '@prisma/client'
import { DefaultSession } from 'next-auth'

declare module 'next-auth/jwt' {
	interface JWT {
		profileId?: string
		roles: UserRole[]
		error?: 'RefreshAccessTokenError'
	}
}

declare module 'next-auth' {
	interface Session {
		profileId?: string
		error?: 'RefreshAccessTokenError'
		user: {
			roles: UserRole[]
		} & DefaultSession['user']
	}

	interface User {
		profileId?: string
		roles: UserRole[]
	}
}
