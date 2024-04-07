import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UserRole } from '@prisma/client'
import { Get, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiMentorsHandler {
	constructor() {}

	@Get()
	public async list() {
		return await prisma.user.findMany({
			where: {
				roles: { has: UserRole.Mentor },
				profile: { isActive: true },
				specialities: { some: {} },
			},
			select: {
				_count: true,
				image: true,
				lang: true,
				specialities: {
					select: { direction: { select: { id: true, name: true } }, name: true, summary: true, level: true },
				},
				profile: {
					select: {
						tgNickname: true,
						name: true,
						preferredGenres: true,
						preferredLevels: true,
						preferredSettings: true,
					},
				},
			},
		})
	}
}

export default createHandler(ApiMentorsHandler)
