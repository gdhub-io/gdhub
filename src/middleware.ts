import { UserRole } from '@prisma/client'
import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'
import { getSession } from 'next-auth/react'

export default withAuth(
	async function middleware(req) {
		const session = await getSession({
			req: {
				headers: {
					cookie: req.headers.get('cookie') || '',
				},
			},
		})

		if (!session?.user) {
			return NextResponse.redirect(new URL('/', req.url))
		}

		const {
			user: { onboardingDone, roles },
		} = session

		if (!onboardingDone && !req.nextUrl.pathname.startsWith('/registration/onboarding')) {
			return NextResponse.redirect(new URL('/registration/onboarding', req.url))
		}

		if (
			req.nextUrl.pathname.startsWith('/live/room/reports') &&
			Array.isArray(roles) &&
			roles.includes(UserRole.Guest) &&
			roles.length == 1
		) {
			return NextResponse.redirect(new URL('/hub', req.url))
		}
	},
	{
		callbacks: {
			authorized: async ({ req, token }) => {
				const pathname = req.nextUrl.pathname

				if (pathname.startsWith('/_next') || pathname === '/favicon.ico') return true

				// Get cookie with session tpken
				const parsed = new RegExp(
					/next-auth.session-token=([0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})/gm
				).exec(req.headers.get('cookie') as string)
				const sessionToken = parsed?.at(1)

				return !!sessionToken
			},
		},
	}
)

export const config = {
	matcher: ['/registration/onboarding', '/hub/:path*', '/profile', '/my/:path*', '/live/:path*', '/admin/:path*'],
}
