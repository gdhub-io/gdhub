import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'
import { env } from './helpers/env'

export default withAuth(
    async function middleware(req) {
        // detect locale prefix from path (e.g. /en/..., /ru/...)
        const pathname = req.nextUrl.pathname
        const firstSegment = pathname.split('/')[1]
        const supportedLocales = ['en', 'ru'] as const
        const localePrefix = supportedLocales.includes(firstSegment as typeof supportedLocales[number]) ? `/${firstSegment}` : ''

        // Redirect unlocalized hub routes to default locale to ensure App Router is used
        if (!localePrefix && pathname.startsWith('/hub')) {
            const url = req.nextUrl.clone()
            url.pathname = `/en${pathname}`
            return NextResponse.redirect(url)
        }

        const session = req.nextauth.token

        if (!session) {
            return NextResponse.redirect(new URL('/', req.url))
        }

        const { onboardingDone, roles } = session

        // rely on Next.js i18n for locale-prefixed redirects

        if (!onboardingDone && !pathname.startsWith(`${localePrefix}/registration/onboarding`) && !pathname.startsWith('/registration/onboarding')) {
            const url = req.nextUrl.clone()
            url.pathname = `${localePrefix || '/en'}/registration/onboarding`
            return NextResponse.redirect(url)
        }

        if (onboardingDone && (pathname.startsWith(`${localePrefix}/registration/onboarding`) || pathname.startsWith('/registration/onboarding'))) {
            const url = req.nextUrl.clone()
            url.pathname = `${localePrefix || '/en'}/hub`
            return NextResponse.redirect(url)
        }

        if (
            pathname.startsWith('/live/room/reports') &&
            Array.isArray(roles) &&
            !roles.includes(prismaClient.UserRole.Author) &&
            !roles.includes(prismaClient.UserRole.Member) &&
            !roles.includes(prismaClient.UserRole.Admin) &&
            !roles.includes(prismaClient.UserRole.Mentor)
        ) {
            const url = req.nextUrl.clone()
            url.pathname = `${localePrefix || '/en'}/hub`
            return NextResponse.redirect(url)
        }

        // redirects
        if (pathname === '/profile' || pathname === '/profile/settings' || pathname === `${localePrefix}/profile` || pathname === `${localePrefix}/profile/settings`) {
            const url = req.nextUrl.clone()
            url.pathname = `${localePrefix || '/en'}/profile/settings/general`
            return NextResponse.redirect(url)
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
        // non-localized (legacy Pages)
        '/registration/onboarding',
        '/hub',
        '/hub/:path*',
        '/profile',
        '/profile/:path*',
        '/my/:path*',
        '/live/:path*',
        '/admin/:path*',
        // localized (App Router)
        '/:locale/hub',
        '/:locale/hub/:path*',
        '/:locale/profile',
        '/:locale/profile/:path*',
    ],
}
