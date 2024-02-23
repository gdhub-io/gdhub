import 'next-auth/jwt'
import { UserRole } from '@prisma/client'
import { DefaultSession } from 'next-auth'

declare module 'next-auth/jwt' {
	interface JWT {
		id: string
		roles: UserRole[]
		onboardingDone: boolean
		lang: string
		error?: 'RefreshAccessTokenError'
		activeSubscription?: string
	}
}

declare module 'next-auth' {
	interface Session {
		error?: 'RefreshAccessTokenError'
		user: {
			id: string
			roles: UserRole[]
			onboardingDone: boolean
			lang: string
			activeSubscription?: string
		} & DefaultSession['user']
	}

	interface User {
		id: string
		roles: UserRole[]
		onboardingDone: boolean
		lang: string
		activeSubscription?: string
	}
}
