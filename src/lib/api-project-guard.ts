import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/services/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import { createMiddlewareDecorator, ForbiddenException, NextFunction } from 'next-api-decorators'
import { getServerSession } from 'next-auth'

/**
 * Use this decorator on your API route handler class to ensure that:
 * - The user is authenticated.
 * - The user is a member of the team specified by the `teamId` query parameter.
 * - The team exists in the database.
 *
 * Throws ForbiddenException if the user is not a member of the team or the team does not exist.
 */
export const ApiProjectTeamGuard = () =>
	createMiddlewareDecorator(async (req: NextApiRequest, res: NextApiResponse, next: NextFunction) => {
		const session = await getServerSession(req, res, authOptions)

		const userId = session?.user?.id
		const teamId = req.query.teamId || req.body.teamId

		if (!userId || !teamId) {
			throw new ForbiddenException()
		}

		const team = await prisma.team.findFirst({
			where: {
				id: teamId,
				members: {
					some: {
						userId,
					},
				},
			},
		})

		if (!team) {
			throw new ForbiddenException()
		}

		next()
	})()
