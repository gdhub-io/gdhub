import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'
import { env } from './helpers/env'

export default withAuth(
	async function middleware(req) {
		const session = req.nextauth.token

		if (!session) {
			return NextResponse.redirect(new URL('/', req.url))
		}

		const { onboardingDone, roles } = session

		if (!onboardingDone && !req.nextUrl.pathname.startsWith('/registration/onboarding')) {
			return NextResponse.redirect(new URL('/registration/onboarding', req.url))
		}

		if (onboardingDone && req.nextUrl.pathname.startsWith('/registration/onboarding')) {
			return NextResponse.redirect(new URL('/hub', req.url))
		}

		if (
			req.nextUrl.pathname.startsWith('/live/room/reports') &&
			Array.isArray(roles) &&
			!roles.includes(prismaClient.UserRole.Author) &&
			!roles.includes(prismaClient.UserRole.Member) &&
			!roles.includes(prismaClient.UserRole.Admin) &&
			!roles.includes(prismaClient.UserRole.Mentor)
		) {
			return NextResponse.redirect(new URL('/hub', req.url))
		}

		// redirects
		if (req.nextUrl.pathname === '/profile' || req.nextUrl.pathname === '/profile/settings') {
			return NextResponse.redirect(new URL('/profile/settings/general', req.url))
		}
	},
	{
		secret: env('NEXTAUTH_SECRET'),
		pages: { signIn: '/signin' },
		callbacks: {
			authorized: async ({ req, token }) => {
				const pathname = req.nextUrl.pathname

				if (pathname.startsWith('/_next') || pathname === '/favicon.ico') return true

				return !!token
			},
		},
	}
)

export const config = {
	matcher: [
		'/registration/onboarding',
		'/hub',
		'/hub/:path*',
		'/profile',
		'/profile/:path*',
		'/my/:path*',
		'/live/:path*',
		'/admin/:path*',
	],
}