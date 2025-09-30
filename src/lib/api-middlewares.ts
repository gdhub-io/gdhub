import { backendApiVerify, publicApiVerify, vercelCronVerify } from '@/helpers/access'
import { env } from '@/helpers/env'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { type NextApiResponse } from 'next'
import { NextFunction, UnauthorizedException, createMiddlewareDecorator } from 'next-api-decorators'
import { getServerSession } from 'next-auth'

export const NextAuthGuard = (
	guardName: 'user' | 'api' | 'public_api' | 'vercel_cron' | 'gumroad' | 'any',
	allowedRoles?: prismaClient.UserRole[]
) =>
	createMiddlewareDecorator(async (req: any, res: NextApiResponse, next: NextFunction) => {
		const session = await getServerSession(req, res, authOptions)

		if (guardName == 'any') {
			req.user = session?.user || null
			return next()
		}

		if (guardName == 'user') {
			if (!session || !session.user) {
				throw new UnauthorizedException()
			}

			// Allowed for any user roles
			if (!allowedRoles) {
				req.user = session.user
				return next()
			}

			// Allowed for specific user roles
			if (allowedRoles.some((i) => session.user.roles.includes(i))) {
				req.user = session.user
				return next()
			} else {
				throw new UnauthorizedException()
			}
		}

		if (guardName == 'api') {
			if (backendApiVerify(req)) {
				next()
			} else {
				throw new UnauthorizedException()
			}
		}

		if (guardName == 'public_api') {
			if (publicApiVerify(req)) {
				next()
			} else {
				throw new UnauthorizedException()
			}
		}

		if (guardName == 'vercel_cron') {
			if (vercelCronVerify(req) || publicApiVerify(req)) {
				next()
			} else {
				throw new UnauthorizedException()
			}
		}

		if (guardName == 'gumroad') {
			if (req.data.access_token == env('GUMROAD_ACCESS_TOKEN')) {
				next()
			} else {
				throw new UnauthorizedException()
			}
		}

		throw new UnauthorizedException()
	})()
