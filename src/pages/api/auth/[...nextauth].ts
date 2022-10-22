import { env } from 'process'
import { createMember } from '@services/airtable'
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export default NextAuth({
	secret: env.NEXT_AUTH_SECRET as string,
	pages: {
		signIn: '/',
	},
	providers: [
		GoogleProvider({
			clientId: env.GOOGLE_OAUTH_CLIENT_ID as string,
			clientSecret: env.GOOGLE_OAUTH_CLEINT_SECRET as string,
		}),
	],
	callbacks: {
		async session({ session }) {
			const member = await createMember(session.user)

			return {
				...session,
				user: {
					id: member?.id,
					roles: member?.roles,
					...session.user,
				},
			}
		},
	},
})
