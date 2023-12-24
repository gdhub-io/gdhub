import { backendApiVerify, publicApiVerify } from '@/helpers/access'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { UserRole } from '@prisma/client'
import { NextApiRequest, NextApiResponse } from 'next'
import { NextFunction, UnauthorizedException, createMiddlewareDecorator } from 'next-api-decorators'
import { User, getServerSession } from 'next-auth'

export const NextAuthGuard = (guardName: 'user' | 'api' | 'public_api' | 'any', allowedRoles?: UserRole[]) =>
	createMiddlewareDecorator(async (req: NextApiRequest & { user: User }, res: NextApiResponse, next: NextFunction) => {
		const session = await getServerSession(req, res, authOptions)

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
	})()
