import { formatNestedJson } from '@/helpers/format'
import { matchingQueue } from '@/queues/matching.queue'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsNumber, IsOptional, IsString } from 'class-validator'
import dayjs from 'dayjs'
import { Body, Post, createHandler } from 'next-api-decorators'

class CronMatchingHandlerDto {
	@IsString()
	@IsOptional()
	projectId?: string

	@IsString()
	@IsOptional()
	specialityId?: string

	@IsNumber()
	@IsOptional()
	take?: number
}

// @NextAuthGuard('public_api')
class CronMatchingHandler {
	@Post()
	public async handler(@Body() { projectId, specialityId, take }: CronMatchingHandlerDto) {
		const lastUpdatedAt = dayjs().subtract(7, 'days').toDate()

		const projects = await prisma.project.findMany({
			where: {
				id: projectId,
				status: prismaClient.ProjectStatus.Approved,
				OR: !specialityId
					? [
							{
								availableSpecialists: {
									some: { updatedAt: { lte: lastUpdatedAt } },
								},
							},
							{ availableSpecialists: { none: {} } },
						]
					: undefined,
			},
			select: {
				id: true,
				audition: true,
				coreMechanics: true,
				createdAt: true,
				description: true,
				genre: true,
				name: true,
				platform: true,
				setting: true,
				status: true,
				visualStyle: true,
				stage: { select: { name: true, isCurrent: true, isCompleted: true } },
				author: {
					select: {
						lang: true,
						profile: {
							select: {
								city: true,
								country: true,
								motivation: true,
								otherResources: true,
								timeForWork: true,
								yearOfBirth: true,
								primaryInterest: true,
								preferredGenres: { select: { name: true } },
								preferredLevels: { select: { name: true } },
								preferredSettings: { select: { name: true } },
							},
						},
					},
				},
				reports: { select: { content: true, publishedAt: true }, take: 100, orderBy: { publishedAt: 'desc' } },
				team: {
					select: {
						vacancies: {
							where: { status: 'Published' },
							select: {
								title: true,
								direction: { select: { name: true } },
								description: true,
								publishedAt: true,
								finishedAt: true,
							},
						},
						members: {
							select: {
								speciality: {
									select: {
										name: true,
										summary: true,
										specialization: true,
										level: true,
										skills: true,
										tools: true,
										jobs: true,
										schools: true,
										createdAt: true,
										direction: { select: { name: true } },
									},
								},
								user: {
									select: {
										lang: true,
										profile: {
											select: {
												city: true,
												country: true,
												motivation: true,
												otherResources: true,
												timeForWork: true,
												yearOfBirth: true,
												primaryInterest: true,
												preferredGenres: { select: { name: true } },
												preferredLevels: { select: { name: true } },
												preferredSettings: { select: { name: true } },
											},
										},
									},
								},
							},
						},
					},
				},
			},
			take: !specialityId ? 1 : undefined,
		})

		const specialists = await prisma.speciality.findMany({
			where: {
				id: specialityId,
				user: { profile: { isActive: true } },
				OR: [{ availableProjects: { none: {} } }],
			},
			select: {
				id: true,
				name: true,
				summary: true,
				specialization: true,
				level: true,
				skills: true,
				tools: true,
				jobs: true,
				schools: true,
				createdAt: true,
				direction: { select: { name: true } },
				user: {
					select: {
						lang: true,
						profile: {
							select: {
								city: true,
								country: true,
								motivation: true,
								otherResources: true,
								timeForWork: true,
								yearOfBirth: true,
								primaryInterest: true,
								preferredGenres: { select: { name: true } },
								preferredLevels: { select: { name: true } },
								preferredSettings: { select: { name: true } },
							},
						},
					},
				},
			},
			orderBy: { updatedAt: 'desc' },
			take,
		})

		let matchingCount = 0

		for (const specialist of specialists) {
			for (const project of projects) {
				const existMatching = await prisma.matchingSpecialistAndProject.findUnique({
					where: {
						projectAndSpecialist: { projectId: project.id, specialityId: specialist.id },
						updatedAt: { gt: lastUpdatedAt },
					},
				})

				if (existMatching) continue

				matchingCount++

				const specialistText = formatNestedJson(specialist)
				const projectText = formatNestedJson(project)

				await matchingQueue.add('matching-spec-and-proj', {
					app: 'main',
					specialityId: specialist.id,
					projectId: project.id,
					specialistText,
					projectText,
				})
			}
		}

		console.log(`Matching specialists in queue: ${matchingCount}`)
	}
}

export default createHandler(CronMatchingHandler)
