// import { getToken } from 'next-auth/jwt'
// import { NextRequest, NextResponse } from 'next/server'

// export async function middleware(req: NextRequest) {
// 	const session = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

// 	if (!session) return NextResponse.redirect(new URL('/', req.url))

// 	return NextResponse.next()
// }

// export { default } from 'next-auth/middleware'

import { withAuth } from 'next-auth/middleware'
export default withAuth({
	callbacks: {
		authorized: ({ token }) => {
			return token?.id ? true : false
		},
	},
})

export const config = {
	matcher: ['/hub/:path*', '/profile', '/live/:path*'],
}
