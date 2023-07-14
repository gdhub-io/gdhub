import AirtableService from '@/services/airtable'
import { prisma } from '@/services/prisma'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient, UserRole } from '@prisma/client'
import { redirect } from 'next/navigation'
import NextAuth, { NextAuthOptions, TokenSet } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(prisma as unknown as PrismaClient),
	pages: {
		signIn: '/signin',
	},
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_OAUTH_CLEINT_SECRET as string,
			authorization: { params: { access_type: 'offline', prompt: 'consent' } },
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
					profileId: profile,
					name: profile || 'Unknown name',
					email: user.get('Email') as string,
					image: user.get('Image Link') as string,
					roles: user.get('Roles') as UserRole[],
				}
			},
		}),
	],
	events: {
		async createUser({ user }) {
			await prisma.user.update({
				where: { id: user.id },
				data: { profile: { create: { name: user.name as string } } },
			})
		},
	},
	callbacks: {
		async session({ session, user }) {
			if (!user) return redirect('/signin')

			session.user = user

			const [google] = await prisma.account.findMany({
				where: { userId: user.id, provider: 'google' },
			})

			if (google?.expires_at && google.expires_at * 1000 < Date.now()) {
				// If the access token has expired, try to refresh it
				try {
					// https://accounts.google.com/.well-known/openid-configuration
					// We need the `token_endpoint`.
					const response = await fetch('https://oauth2.googleapis.com/token', {
						headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
						body: new URLSearchParams({
							client_id: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
							client_secret: process.env.GOOGLE_OAUTH_CLEINT_SECRET as string,
							grant_type: 'refresh_token',
							refresh_token: google.refresh_token as string,
						}),
						method: 'POST',
					})

					const tokens: TokenSet & { expires_in: number } = await response.json()

					if (!response.ok || !tokens.expires_in) throw tokens

					await prisma.account.update({
						data: {
							access_token: tokens.access_token,
							expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
							refresh_token: tokens.refresh_token ?? google.refresh_token,
						},
						where: {
							provider_providerAccountId: {
								provider: 'google',
								providerAccountId: google.providerAccountId,
							},
						},
					})
				} catch (error) {
					console.error('Error refreshing access token', error)
					// The error property will be used client-side to handle the refresh token error
					session.error = 'RefreshAccessTokenError'
				}
			}

			return session
		},
	},
}

export default NextAuth(authOptions)
