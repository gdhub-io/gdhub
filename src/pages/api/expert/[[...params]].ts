import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { createHandler, Get, Param } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiExpertHandler {
	constructor() {}

	@Get('/:id')
	public async get(@Param('id') id: string) {
		const expert = await prisma.user.findFirst({
			where: {
				id,
				specialities: {
					some: {
						level: { in: [prismaClient.SkillLevel.Experienced, prismaClient.SkillLevel.Expert] },
						openForQuestions: { isEmpty: false },
					},
				},
			},
			select: {
				id: true,
				name: true,
				image: true,
				lang: true,
				// projects: {
				// 	select: { id: true, name: true, slug: true, coverImage: true, genre: true, platform: true },
				// },
				memberInTeams: {
					select: {
						team: {
							select: {
								project: {
									select: { id: true, name: true, slug: true, coverImage: true, genre: true, platform: true },
								},
							},
						},
					},
				},
				specialities: {
					where: {
						level: { in: [prismaClient.SkillLevel.Experienced, prismaClient.SkillLevel.Expert] },
						openForQuestions: { isEmpty: false },
					},
					select: {
						id: true,
						name: true,
						summary: true,
						specialization: true,
						timeForMentoring: true,
						openForQuestions: true,
						level: true,
						direction: { select: { id: true, name: true } },
					},
				},
			},
		})

		return expert
	}
}

export default createHandler(ApiExpertHandler)
