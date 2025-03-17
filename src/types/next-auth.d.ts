import 'next-auth/jwt'
import { DefaultSession } from 'next-auth'

declare module 'next-auth/jwt' {
	interface JWT {
		id: string
		roles: UserRole[]
		onboardingDone: boolean
		lang: string
		error?: 'RefreshAccessTokenError'
		activeSubscription?: string
		telegramId?: string
	}
}

declare module 'next-auth' {
	interface Session {
		error?: 'RefreshAccessTokenError' | 'InvalidGrantError'
		user: {
			id: string
			roles: UserRole[]
			onboardingDone: boolean
			lang: string
			activeSubscription?: string
			telegramId?: string
			name: string
			email: string
			image: string
			[key: string]: any
		} & DefaultSession['user']
	}

	interface User {
		id: string
		roles: UserRole[]
		onboardingDone: boolean
		lang: string
		activeSubscription?: string
		telegramId?: string
	}
}
