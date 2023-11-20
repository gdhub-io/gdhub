import { ExtendedPrismaClient } from '@/services/prisma'
import { ProjectStatus, TeamMemberStatus } from '@prisma/client'
import { AirtableBase } from 'airtable/lib/airtable_base'
import dayjs from 'dayjs'

export const transferProjects = async (airtableService: AirtableBase, prisma: ExtendedPrismaClient) => {
	const defaultWorkDirectionForNewAuthor = await prisma.workDirection.findFirst({ where: { name: 'game design' } })

	await airtableService('Project Ideas')
		.select()
		.eachPage(
			async (records, fetchNextPage) => {
				let countCreatedRecords = 0

				if (records.length) {
					for (const record of records) {
						// Get Season Status
						let projectStatus: ProjectStatus | undefined = undefined
						switch (record.get('Status')) {
							case 'Closed':
								projectStatus = ProjectStatus.Rejected
								break

							default:
								projectStatus = record.get('Status') as ProjectStatus
						}

						let stageName = record.get('Stage') as string
						switch (record.get('Stage')) {
							case 'Research':
								stageName = 'Searching'
								break
							case 'Graduated':
								stageName = 'Done'
								break
						}

						const [seasonName] = record.get('Season Name') as string[]
						const season = await prisma.season.findFirst({
							where: { name: seasonName },
						})

						const stage = await prisma.seasonStage.findFirst({
							where: { name: stageName, seasonId: season?.id },
						})

						const [authorEmail] = record.get('Author Email') as string[]
						const author = await prisma.user.findUnique({
							where: { email: authorEmail },
							include: { specialities: true },
						})

						const authorSpecialityId = author?.specialities[0]?.id

						// if (!author) continue

						console.log(
							'stage',
							record.get('Name'),
							author?.name,
							seasonName + ` (${season?.id})`,
							stageName + ` (${stage?.id})`,
							author?.specialities[0]?.name
						)

						try {
							const createdProject = await prisma.project.create({
								data: {
									name: record.get('Name') as string,
									slug: record.get('Slug') as string,
									description: record.get('Description') as string,
									startedAt: dayjs(record.get('Started At') as string).toISOString(),
									finishedAt: record.get('Finished At')
										? dayjs(record.get('Finished At') as string).toISOString()
										: undefined,
									createdAt: dayjs(record.get('Created') as string).toISOString(),
									updatedAt: dayjs(record.get('Last Modified') as string).toISOString(),
									status: projectStatus,
									coverImage: record.get('Cover Image') as string,
									genre: record.get('Genre') as string,
									platform: record.get('Platform') as string,
									setting: record.get('Setting') as string,
									visualStyle: record.get('Visual Style') as string,
									audition: record.get('Audition') as string,
									conceptLink: record.get('Document Link') as string,
									coreMechanics: record.get('Core Mechanics')
										? (record.get('Core Mechanics') as string).split('|')
										: [],
									gddLink: record.get('GDD Link') as string,
									pitchdeckLink: record.get('Slides Link') as string,
									videoLink: record.get('Youtube Video ID') as string,
									author: { connect: { id: author?.id } },
									stage: { connect: { id: stage?.id } },
									team: {
										connectOrCreate: {
											where: { slug: 'team-' + author?.id },
											create: {
												name: author?.name + `'s Team`,
												slug: 'team-' + author?.id,
												members: {
													create: {
														user: { connect: { email: author?.email! } },
														position: 'CEO',
														startedAt: dayjs(record.get('Created') as string).toISOString(),
														status: TeamMemberStatus.Founder,
														speciality: {
															connect: authorSpecialityId ? { id: authorSpecialityId } : undefined,
															create: !authorSpecialityId
																? {
																		name: 'Game designer',
																		level: 'Experienced',
																		specialization: 'Game design',
																		user: { connect: { id: author?.id } },
																		direction: { connect: { id: defaultWorkDirectionForNewAuthor?.id } },
																  }
																: undefined,
														},
													},
												},
											},
										},
									},
									// estimations: {},
									// reports: {},
								},
							})

							if (createdProject) {
								countCreatedRecords++
							}
						} catch (err: any) {
							// console.error(err.message)
						}
					}

					if (countCreatedRecords > 0) {
						console.info('Projects was transferd:', countCreatedRecords)
					}
				}

				fetchNextPage()
			},
			function done(err) {
				if (err) {
					console.error(err)
					return
				}
			}
		)
}
