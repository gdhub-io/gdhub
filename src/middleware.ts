import { UserRole } from '@prisma/client'
import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

export default withAuth(
	function middleware(req) {
		const { token } = req.nextauth

		if (
			req.nextUrl.pathname.startsWith('/live/room/reports') &&
			Array.isArray(token?.roles) &&
			token?.roles.includes(UserRole.Guest) &&
			token?.roles.length == 1
		) {
			return NextResponse.redirect(new URL('/hub', req.url))
		}

		if (token && req.nextUrl.pathname == '/') {
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
	matcher: ['/hub/:path*', '/profile', '/my/:path*', '/live/:path*', '/admin/:path*'],
}
