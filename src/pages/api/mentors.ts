import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Get, Query, createHandler } from 'next-api-decorators'

class ApiMentorsHandler {
	constructor() {}

	@Get()
	public async list(@Query('workDirectionId') workDirectionId?: string) {
		const mentors = await prisma.user.findMany({
			where: {
				telegramId: { not: null },
				specialities: {
					some: {
						level: { in: [prismaClient.SkillLevel.Experienced, prismaClient.SkillLevel.Expert] },
						openForQuestions: { isEmpty: false },
						...(workDirectionId ? { workDirectionId } : {}),
					},
				},
			},
			select: {
				id: true,
				name: true,
				image: true,
				profile: {
					select: {
						tgNickname: true,
					},
				},
				specialities: {
					where: {
						level: { in: [prismaClient.SkillLevel.Experienced, prismaClient.SkillLevel.Expert] },
						openForQuestions: { isEmpty: false },
						...(workDirectionId ? { workDirectionId } : {}),
					},
					include: {
						direction: true,
					},
				},
			},
		})

		return mentors
	}
}

export default createHandler(ApiMentorsHandler)
