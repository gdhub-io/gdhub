import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UserRole } from '@prisma/client'
import { IsString } from 'class-validator'
import { Get, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamIdDto {
	@IsString()
	id: string
}

@NextAuthGuard('user')
class ApiSpecialistHandler {
	constructor() {}

	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { id }: ParamIdDto) {
		const isAdmin = req.user.roles?.includes(UserRole.Admin)

		const activeSubscription = await prisma.user.activeSubscription(req.user.id!)

		const specialist = await prisma.speciality.findFirst({
			where: { id },
			include: {
				user: {
					select: {
						name: true,
						image: true,
						email: true,
						profile: { include: { preferredGenres: true, preferredLevels: true, preferredSettings: true } },
					},
				},
				direction: true,
				// paid data
				availableProjects: activeSubscription
					? {
							where: !isAdmin ? { project: { authorId: req.user.id } } : undefined,
							include: { project: { select: { name: true } } },
					  }
					: undefined,
			},
		})

		return specialist
	}
}

export default createHandler(ApiSpecialistHandler)
