import { env } from '@/helpers/env'
import { brevoApi } from '@/services/brevo'
import { prisma } from '@/services/prisma'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { redirect } from 'next/navigation'
import NextAuth, { NextAuthOptions, TokenSet } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import EmailProvider from 'next-auth/providers/email'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(prisma as unknown as PrismaClient),
	secret: env('NEXTAUTH_SECRET'),
	session: { strategy: 'jwt' },
	pages: {
		signIn: '/signin',
	},
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_OAUTH_CLEINT_SECRET as string,
			authorization: { params: { access_type: 'offline', prompt: 'consent' } },
			allowDangerousEmailAccountLinking: true,
			httpOptions: { timeout: 10000 },
		}),
		EmailProvider({
			from: process.env.EMAIL_FROM as string,
			server: process.env.EMAIL_SERVER as string,
			async sendVerificationRequest({ identifier: email, url, provider: { server, from } }) {
				try {
					const userExist = await prisma.user.findUnique({ where: { email } })
					let sendResult: any

					if (userExist) {
						sendResult = await brevoApi.smtp.sendTransacEmail({
							subject: 'Sign in',
							to: [{ email }],
							templateId: 1,
							params: {
								link: url,
							},
						})
					} else {
						sendResult = await brevoApi.smtp.sendTransacEmail({
							subject: 'Registration',
							to: [{ email }],
							templateId: 2,
							params: {
								link: url,
							},
						})
					}

					if (sendResult.error) throw Error(sendResult.error.message)

					console.log('sendVerificationRequest was sent')
				} catch (error: any) {
					console.error('', error)
				}
			},
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

				const profile = await prisma.profile.findFirst({ where: { tgNickname: username }, include: { user: true } })

				if (!profile) return null

				return {
					id: profile.user.id,
					profileId: profile.id,
					name: profile.name || 'Unknown name',
					email: profile.user.email,
					image: profile.user.image,
					roles: profile.user.roles,
					onboardingDone: profile.user.onboardingDone,
				}
			},
		}),
	],
	callbacks: {
		async jwt({ token }) {
			if (!token.email) return

			const user = await prisma.user.findUnique({ where: { email: token.email } })
			return { ...token, ...user } as any
		},
		async session({ session, token, user, newSession }) {
			if (!token) return redirect('/signin')

			session.user = token

			const [google] = await prisma.account.findMany({
				where: { userId: token.id, provider: 'google' },
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
