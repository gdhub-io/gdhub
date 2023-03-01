import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
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
	},
	{
		callbacks: {
			authorized: ({ token }) => {
				return token?.id ? true : false
			},
		},
	}
)

export const config = {
	matcher: ['/hub/:path*', '/profile', '/my/:path*', '/live/:path*'],
}
