import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'
export default withAuth(
	function middleware(req) {
		const { token } = req.nextauth

		if (
			req.nextUrl.pathname.startsWith('/live/room/reports') &&
			Array.isArray(token?.roles) &&
			token?.roles.includes('guest') &&
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
			authorized: ({ req, token }) => {
				const pathname = req.nextUrl.pathname

				if (pathname.startsWith('/_next') || pathname === '/favicon.ico') return true
				if (token) return true

				return false
			},
		},
	}
)

export const config = {
	matcher: ['/hub/:path*', '/profile', '/my/:path*', '/live/:path*'],
}
