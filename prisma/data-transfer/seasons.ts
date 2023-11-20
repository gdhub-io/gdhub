import { ExtendedPrismaClient } from '@/services/prisma'
import { SeasonStatus } from '@prisma/client'
import { FieldSet, Records } from 'airtable'
import { AirtableBase } from 'airtable/lib/airtable_base'
import dayjs from 'dayjs'

export const transferSeasons = async (airtableService: AirtableBase, prisma: ExtendedPrismaClient) => {
	await airtableService('Seasons')
		.select()
		.eachPage(
			async (records, fetchNextPage) => {
				let countCreatedRecords = 0

				if (records.length) {
					for (const record of records) {
						// Get Season Status
						let seasonStatus: SeasonStatus | undefined = undefined
						switch (record.get('Status')) {
							case 'Active':
								seasonStatus = SeasonStatus.Active
								break
							case 'Not Active':
								seasonStatus = SeasonStatus.Done
								break

							default:
								seasonStatus = SeasonStatus.Planning
						}

						const stages = await airtableService('Season Stages')
							.select({
								filterByFormula: `{Season ID} = "${record.id}"`,
							})
							.all()

						const airReports = record.get('Project Reports') as string[]
						let seasonReports: Records<FieldSet> | undefined = undefined

						if (airReports?.length) {
							seasonReports = await airtableService('Season Reports')
								.select({
									filterByFormula: `{Season Slug} = "${record.fields.Slug as string}"`,
								})
								.all()
						}

						try {
							const createdSeason = await prisma.season.create({
								data: {
									name: record.get('Name') as string,
									slug: record.get('Slug') as string,
									description: record.get('Description') as string,
									startedAt: dayjs(record.get('Started At') as string).toISOString(),
									finishedAt: dayjs(record.get('Finished At') as string).toISOString(),
									status: seasonStatus,
									coverImage: record.get('seoImage') as string,
								},
							})

							// Delete automatic created stages
							await prisma.seasonStage.deleteMany({ where: { seasonId: createdSeason.id } })

							for (const s of stages) {
								await prisma.seasonStage.create({
									data: {
										seasonId: createdSeason.id,
										name: s.get('Name') as string,
										isCurrent: s.get('Status') == 'Active',
										description: s.get('Description') as string,
										startedAt: record.get('Started At')
											? dayjs(record.get('Started At') as string).toISOString()
											: undefined,
										finishedAt: record.get('Finished At')
											? dayjs(record.get('Finished At') as string).toISOString()
											: undefined,
										order: +(s.get('Order') as string) || 0,
										streamReports: {
											createMany: seasonReports
												? {
														data: seasonReports
															.filter((r) => (r.fields.Stage as string[])[0] == s.id)
															.map((r) => ({
																date: dayjs(r.get('Date') as string).toISOString(),
															})),
												  }
												: undefined,
										},
									},
								})
							}

							if (createdSeason) {
								countCreatedRecords++
							}
						} catch (err: any) {
							// console.error(err.message)
						}
					}

					if (countCreatedRecords > 0) {
						console.info('Seasons was transferd:', countCreatedRecords)
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
