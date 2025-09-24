import { brevoTemplates } from '@/config/brevo-templates'
import { env } from '@/helpers/env'
import { brevoApi } from '@/services/brevo'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import NextAuth, { NextAuthOptions, TokenSet } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import EmailProvider from 'next-auth/providers/email'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(prisma as unknown as prismaClient.PrismaClient),
	secret: env('NEXTAUTH_SECRET'),
	session: { strategy: 'jwt' },
	pages: {
		signIn: '/signin',
	},
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_OAUTH_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET as string,
			authorization: { params: { access_type: 'offline', prompt: 'consent' } },
			allowDangerousEmailAccountLinking: true,
			httpOptions: { timeout: 10000 },
		}),
		EmailProvider({
			from: process.env.EMAIL_FROM as string,
			server: process.env.EMAIL_SERVER as string,
			async sendVerificationRequest({ identifier: email, url, provider }, ...other) {
				try {
					console.log('sendVerificationRequest', email, url, provider, other)
					const userExist = await prisma.user.findUnique({ where: { email } })
					let sendResult: any

					if (userExist) {
						sendResult = await brevoApi.smtp.sendTransacEmail({
							to: [{ email }],
							templateId: brevoTemplates[userExist.lang as keyof typeof brevoTemplates].signin,
							params: {
								link: url,
							},
						})
					} else {
						const defaultLang = env('NEXT_PUBLIC_APP_DEFAULT_LOCALE') as prismaClient.Language
						const params = new URL(url).searchParams
						const callbackUrl = params.get('callbackUrl') || ''
						const callback = new URL(callbackUrl).searchParams
						const locale = (callback.get('locale') as prismaClient.Language) || defaultLang

						sendResult = await brevoApi.smtp.sendTransacEmail({
							to: [{ email }],
							templateId: brevoTemplates[locale as keyof typeof brevoTemplates].registration,
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
		...(process.env.NODE_ENV !== 'production'
			? [
					Credentials({
						id: 'e2e',
						name: 'E2E Credentials',
						credentials: { email: { label: 'Email', type: 'text' } },
						async authorize(credentials) {
							if (!credentials?.email) return null
							const email = String(credentials.email)
							let user = await prisma.user.findUnique({ where: { email } })
							if (!user) {
								user = await prisma.user.create({
									data: {
										email,
										name: 'E2E User',
										emailVerified: new Date(),
										roles: [],
										agreements: {},
									},
								})
								await prisma.profile.create({ data: { userId: user.id, name: 'E2E User' } })
							}
							return user as any
						},
					}),
				]
			: []),
	],
	callbacks: {
		async jwt({ token }) {
			if (!token.email) return

			const user = await prisma.user.findUnique({ where: { email: token.email } })
			const activeSubscription = await prisma.user.activeSubscription(user?.id!)

			return { ...token, ...user, activeSubscription: activeSubscription?.id } as any
		},
		async session({ session, token, user, newSession }) {
			if (!token) return { ...session, error: 'InvalidGrantError' }

			session.user = token as any

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
							client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET as string,
							grant_type: 'refresh_token',
							refresh_token: google.refresh_token as string,
						}),
						method: 'POST',
					})

					const tokens: TokenSet & { expires_in: number } = await response.json()

					if (!response.ok) {
						console.error('Token refresh response not OK:', tokens)

						// Delete the account if the refresh token is expired or revoked
						await prisma.account.delete({
							where: {
								provider_providerAccountId: {
									provider: 'google',
									providerAccountId: google.providerAccountId,
								},
							},
						})

						// Check for invalid_grant error specifically
						if (tokens.error === 'invalid_grant') {
							console.error('Invalid grant error - refresh token is expired or revoked')
							session.error = 'InvalidGrantError'

							// Clear session and redirect to signin
							return {
								...session,
								error: 'InvalidGrantError',
								redirect: '/signin',
							}
						}

						throw tokens
					}

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

					// Check if it's an invalid_grant error
					const errorObj = error as any
					if (errorObj?.error === 'invalid_grant') {
						console.error('Invalid grant error - refresh token is expired or revoked')
						session.error = 'InvalidGrantError'
					} else {
						// For other errors
						session.error = 'RefreshAccessTokenError'
					}
				}
			}

			return session
		},
	},
}

export default NextAuth(authOptions)
