import AirtableService, { findOrCreateMember } from '@services/airtable'
import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
	secret: process.env.NEXT_AUTH_SECRET as string,
	pages: {
		signIn: '/',
	},
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_OAUTH_CLEINT_SECRET as string,
		}),
		CredentialsProvider({
			id: 'telegram-web-app',
			name: 'Sign in with Telegram Web App',
			credentials: {
				username: { label: 'Username' },
			},
			async authorize(credentials, req) {
				const { username } = req.query as { username: string }

				if (!username) return null

				const [user] = await AirtableService('Accounts')
					.select({
						filterByFormula: `{Telegram Nickname} = "${username}"`,
						maxRecords: 1,
					})
					.all()

				if (!user) return null

				const [profile] = user.get('Profile') as string[]

				return {
					id: user.id,
					name: profile || 'Unknown name',
					email: user.get('Email') as string,
					image: user.get('Image Link') as string,
				}
			},
		}),
	],
	callbacks: {
		async session({ session, token }) {
			return {
				...session,
				user: {
					id: token.id,
					roles: token.roles,
					name: token.name,
					image: token.picture,
					...session.user,
					hasRole: (roleName: string) => {
						const roles = token.roles as string[]
						const response = roles.find((role: string) => role === roleName.toLowerCase())

						return response ? true : false
					},
				},
			}
		},
		async jwt({ token }) {
			const { email, name, picture } = token
			const member = await findOrCreateMember({ email, name, image: picture })

			if (member) {
				token.id = member.id
				token.roles = member.roles
				token.name = member.name
			}

			return token
		},
	},
}

export default NextAuth(authOptions)
