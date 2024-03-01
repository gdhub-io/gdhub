import { formatNestedJson } from '@/helpers/format'
import { matchingQueue } from '@/queues/matching.queue'
import { prisma } from '@/services/prisma'
import { ProjectStatus } from '@prisma/client'
import dayjs from 'dayjs'
import { Post, createHandler } from 'next-api-decorators'

// @NextAuthGuard('public_api')
class CronMatchingHandler {
	@Post()
	public async handler() {
		const lastUpdatedAt = dayjs().subtract(7, 'days').toDate()

		const projects = await prisma.project.findMany({
			where: {
				status: ProjectStatus.Approved,
				OR: [
					{
						availableSpecialists: {
							some: { updatedAt: { lte: lastUpdatedAt } },
						},
					},
					{ availableSpecialists: { none: {} } },
				],
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
			take: 1,
		})

		const specialists = await prisma.speciality.findMany({
			where: {
				// user: { profile: { isActive: true } },
				// OR: [
				// {
				// 	availableProjects: {
				// 		every: { updatedAt: { lte: lastUpdatedAt } },
				// 	},
				// },
				// { availableProjects: { none: {} } },
				// ],
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
			// take: 10,
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
					specialityId: specialist.id,
					projectId: project.id,
					specialistText,
					projectText,
				})
			}
		}

		console.log(`Matching jobs in queue: ${matchingCount}`)
	}
}

export default createHandler(CronMatchingHandler)
