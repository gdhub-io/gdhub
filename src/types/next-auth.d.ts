import 'next-auth/jwt'
import { UserRole } from '@prisma/client'
import { DefaultSession } from 'next-auth'

declare module 'next-auth/jwt' {
	interface JWT {
		id: string
		roles: UserRole[]
		error?: 'RefreshAccessTokenError'
	}
}

declare module 'next-auth' {
	interface Session {
		error?: 'RefreshAccessTokenError'
		user: {
			id: string
			roles: UserRole[]
		} & DefaultSession['user']
	}

	interface User {
		id: string
		roles: UserRole[]
	}
}
