import { ExtendedPrismaClient } from '@/services/prisma'
import { Prisma, TeamMemberStatus } from '@prisma/client'
import { AirtableBase } from 'airtable/lib/airtable_base'
import dayjs from 'dayjs'

export const transferTeamMembers = async (airtableService: AirtableBase, prisma: ExtendedPrismaClient) => {
	console.info('Team Member transfer has started')

	// Delete all existed records
	await prisma.teamMember.deleteMany({ where: { NOT: { status: 'Founder' } } })

	await new Promise((resolve, reject) => {
		airtableService('Project Members')
			.select({
				pageSize: 100,
				sort: [{ field: 'Created At', direction: 'asc' }],
			})
			.eachPage(
				async (records, fetchNextPage) => {
					const newRecords: Prisma.TeamMemberCreateManyInput[] = []
					const airtableRecords = records.map(
						(record) => ({ ...record.fields, id: record.id }) as { id: string; [key: string]: any }
					)

					for (const record of airtableRecords) {
						let status: TeamMemberStatus

						switch (record.Status) {
							case 'Intent':
								status = TeamMemberStatus.Applicant
								break
							case 'Member':
								status = TeamMemberStatus.Hired
								break

							default:
								status = record.Status as TeamMemberStatus
						}

						const team = await prisma.team.findFirst({
							where: { projects: { some: { name: record['Project Name'][0] } } },
						})

						const vacancy = await prisma.teamVacancy.findFirst({
							where: { title: record['Vacancy Name'][0] },
						})

						const user = await prisma.user.findFirst({
							where: { email: record['Member Email'][0] },
							include: { specialities: { where: { name: { equals: record['Speciality Name'][0] } } } },
						})

						console.log(
							'team members',
							record['Member Email'][0],
							status,
							team?.name,
							vacancy?.title,
							user?.id,
							user?.specialities.length
						)

						newRecords.push({
							position: record.Position,
							status,
							specialityId: user!.specialities[0].id,
							teamId: team!.id,
							userId: user!.id,
							vacancyId: vacancy!.id,
							allowedContacts: record['Allowed Contacts'] as string[],
							createdAt: dayjs(record['Created At']).toISOString(),
							updatedAt: dayjs(record['Last Modified']).toISOString(),
							finishedAt: record['Started At'] ? dayjs(record['Finished At']).toISOString() : undefined,
							startedAt: record['Started At'] ? dayjs(record['Started At']).toISOString() : undefined,
						})
					}

					const createdTeamMembers = await prisma.teamMember.createMany({
						data: newRecords,
					})

					console.log('Team Members were inserted', createdTeamMembers.count)

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

	console.info('Team Member transfer has finised')
}
