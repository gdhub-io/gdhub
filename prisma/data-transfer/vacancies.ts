import { ExtendedPrismaClient } from '@/services/prisma'
import { Prisma, TeamVacancyStatus } from '@prisma/client'
import { AirtableBase } from 'airtable/lib/airtable_base'
import dayjs from 'dayjs'

export const transferVacancies = async (airtableService: AirtableBase, prisma: ExtendedPrismaClient) => {
	console.info('Vacancies transfer has started')

	// Delete all existed records
	await prisma.teamVacancy.deleteMany()

	await new Promise((resolve, reject) => {
		airtableService('Project Vacancies')
			.select({
				pageSize: 100,
				sort: [{ field: 'Created At', direction: 'asc' }],
			})
			.eachPage(
				async (records, fetchNextPage) => {
					const newRecords: Prisma.TeamVacancyCreateManyInput[] = []
					const airtableVacancies = records.map(
						(record) => ({ ...record.fields, id: record.id }) as { id: string; [key: string]: any }
					)

					for (const airtableVacancy of airtableVacancies) {
						let status: TeamVacancyStatus = TeamVacancyStatus.Draft

						switch (airtableVacancy.Status) {
							case 'Draft':
								status = TeamVacancyStatus.Draft
								break
							case 'Opened':
								status = TeamVacancyStatus.Published
								break
							case 'Closed':
								status = TeamVacancyStatus.Closed
								break
						}

						const team = await prisma.team.findFirst({
							where: { projects: { some: { slug: airtableVacancy['Project Slug'][0] } } },
						})

						const airtableDirectionText = (airtableVacancy.Direction as string).toLowerCase()
						let directionName = airtableDirectionText

						switch (airtableDirectionText) {
							case 'programming':
								directionName = 'development'
								break
							case 'web programming':
								directionName = 'web development'
								break
							case 'product management':
								directionName = 'management'
								break
							case 'project management':
								directionName = 'management'
								break
							case 'team management':
								directionName = 'management'
								break
							case 'sound design & music':
								directionName = 'music & sound'
								break
						}

						const direction = await prisma.workDirection.findFirst({
							where: {
								name: directionName,
							},
						})

						console.log('vacancies', airtableVacancy.Name, status, direction?.name, team?.name)

						newRecords.push({
							title: airtableVacancy.Name,
							description: airtableVacancy.Description,
							status,
							directionId: direction!.id,
							teamId: team!.id,
							publishedAt: airtableVacancy['Published At']
								? dayjs(airtableVacancy['Published At']).toISOString()
								: undefined,
							closedAt: airtableVacancy['Closed At'] ? dayjs(airtableVacancy['Closed At']).toISOString() : undefined,
							finishedAt: dayjs(airtableVacancy['Finished At']).toISOString(),
							createdAt: dayjs(airtableVacancy['Created At']).toISOString(),
							updatedAt: dayjs(airtableVacancy['Last Modified']).toISOString(),
						})
					}

					const createdVacancy = await prisma.teamVacancy.createMany({
						data: newRecords,
					})

					console.log('Vacancies were inserted', createdVacancy.count)

					fetchNextPage()
				},
				function done(err: any) {
					if (err) {
						console.error(err)
						reject()
						return
					}

					resolve(true)
				}
			)
	})

	console.info('Vacancies transfer has finised')
}
