import { ExtendedPrismaClient } from '@/services/prisma'
import { ProjectStatus, TeamMemberStatus } from '@prisma/client'
import { FieldSet, Records } from 'airtable'
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
						try {
							// Get Project Status
							let projectStatus: ProjectStatus | undefined = undefined
							switch (record.get('Status')) {
								case 'Closed':
									projectStatus = ProjectStatus.Rejected
									break

								default:
									projectStatus = record.get('Status') as ProjectStatus
							}

							// Get Stage Name
							let stageName = record.get('Stage') as string
							switch (record.get('Stage')) {
								case 'Research':
									stageName = 'Searching'
									break
								case 'Graduated':
									stageName = 'Done'
									break
							}

							// Get Season
							const [seasonName] = record.get('Season Name') as string[]
							const season = await prisma.season.findFirst({
								where: { name: seasonName },
							})

							// Get Stage
							const stage = await prisma.seasonStage.findFirst({
								where: { name: stageName, seasonId: season?.id },
							})

							// Get Author
							const [authorEmail] = record.get('Author Email') as string[]
							const author = await prisma.user.findUnique({
								where: { email: authorEmail },
								include: { specialities: true },
							})

							const authorSpecialityId = author?.specialities[0]?.id

							// Get Reports
							const existedReports = record.get('Project Reports 2') as string[]
							let airtableReports: Records<FieldSet> = []

							if (existedReports?.length) {
								airtableReports = await airtableService('Project Reports')
									.select({
										filterByFormula: `FIND(RECORD_ID(), "${existedReports.join(' ')}")`,
									})
									.all()
							}

							// Get Estimations
							const existedEtimations = record.get('Ideas Estimation') as string[]
							let airtableEstimations: Records<FieldSet> = []

							if (existedEtimations?.length) {
								airtableEstimations = await airtableService('Ideas Estimation')
									.select({
										filterByFormula: `FIND(RECORD_ID(), "${existedEtimations.join(' ')}")`,
									})
									.all()
							}

							console.log(
								'stage',
								record.get('Name'),
								author?.name,
								seasonName + ` (${season?.id})`,
								stageName + ` (${stage?.id})`,
								author?.specialities[0]?.name,
								airtableReports.length,
								airtableEstimations.length
							)

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
								},
							})

							// Transfer reports
							await prisma.projectReport.createMany({
								data: airtableReports.map((report) => ({
									projectId: createdProject!.id,
									content: report.get('Content') as string,
									publishedAt: dayjs(record.get('Date') as string).toISOString(),
									authorId: author!.id,
									video: report.get('Youtube Video ID') as string,
								})),
							})

							// Transfer estimations
							if (airtableEstimations.length > 0)
								for (const estimation of airtableEstimations) {
									// Get Season
									const [_seasonId] = estimation.get('Season') as string[]
									const [_airtableSeason] = await airtableService('Seasons')
										.select({ filterByFormula: `{ID} = "${_seasonId}"` })
										.all()
									const _season = await prisma.season.findFirst({
										where: { slug: _airtableSeason.get('Slug') as string },
									})

									// Get Stage
									const [_stageId] = estimation.get('Stage') as string[]
									const [_airtableStage] = await airtableService('Season Stages')
										.select({ filterByFormula: `RECORD_ID() = "${_stageId}"` })
										.all()
									const _stage = await prisma.seasonStage.findFirst({
										where: { name: _airtableStage.get('Name') as string, seasonId: _season?.id },
									})

									const [_expertId] = estimation.get('Mentor') as string[]
									const [_airtableProfile] = await airtableService('Profiles')
										.select({ filterByFormula: `RECORD_ID() = "${_expertId}"` })
										.all()
									const _expert = await prisma.user.findFirst({
										where: { email: (_airtableProfile.get('Email (from Account)') as string[])[0] },
									})

									console.log('--estimation', _season?.id, _stage?.id, _expert?.id)

									await prisma.projectEstimation.create({
										data: {
											projectId: createdProject!.id,
											isApproved: estimation.get('Solution') != 'Отклоняю.',
											notes: (estimation.get('Notes') as string) || '',
											data: [
												{ q: 'Originality', a: estimation.get('Originality') as number },
												{ q: 'Can Make', a: estimation.get('Can Make') as number },
												{ q: 'Can Make in Lab', a: estimation.get('Can Make in Lab') as number },
												{ q: 'Author Knows What', a: estimation.get('Author Knows What') as number },
												{ q: 'Author Knows TA', a: estimation.get('Author Knows TA') as number },
												{ q: 'Commercial Potential', a: estimation.get('Commercial Potential') as number },
											],
											expertId: _expert!.id,
											stageId: _stage!.id,
										},
									})
								}

							if (createdProject) {
								countCreatedRecords++
							}
						} catch (err: any) {
							console.error(err.message)
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
