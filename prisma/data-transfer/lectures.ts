import { ExtendedPrismaClient } from '@/services/prisma'
import { LectureStage, User } from '@prisma/client'
import { FieldSet, Records } from 'airtable'
import { AirtableBase } from 'airtable/lib/airtable_base'
import dayjs from 'dayjs'

export const transferLectures = async (airtableService: AirtableBase, prisma: ExtendedPrismaClient) => {
	// Delete all existed records
	await prisma.lecture.deleteMany()

	console.info('Lecture transfer has started')

	await new Promise((resolve, reject) => {
		airtableService('Lectures')
			.select({
				pageSize: 100,
				sort: [{ field: 'Created At', direction: 'asc' }],
			})
			.eachPage(
				async (records, fetchNextPage) => {
					let newRecordsCount = 0
					const airtableLectures = records.map(
						(record) => ({ ...record.fields, id: record.id }) as { id: string; [key: string]: any }
					)

					for (const record of airtableLectures) {
						// Direction
						const airtableDirectionText = (record.Direction as string).toLowerCase()
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

						// Requested By
						let userOfRequest: User | null = null
						if (record['Requested By']) {
							const [airtableRequestedById] = record['Requested By'] as string[]
							const [airtableAccount] = await airtableService('Accounts')
								.select({ filterByFormula: `RECORD_ID() = "${airtableRequestedById}"` })
								.all()
							userOfRequest = await prisma.user.findUnique({
								where: { email: airtableAccount.get('Email') as string },
							})
						}

						// Lecture Listeners
						const airtableListenerIds = record['Lecture Listeners'] as string[]
						let listeners: User[] = []
						let airtableListeners: Records<FieldSet> | [] = []

						if (airtableListenerIds) {
							airtableListeners = await airtableService('Lecture Listeners')
								.select({ filterByFormula: `FIND(RECORD_ID(), "${airtableListenerIds.join(' ')}")` })
								.all()

							listeners = await prisma.user.findMany({
								where: {
									email: {
										in: airtableListeners
											.filter((r) => {
												const email = r.get('Email (from Listener Account)') as string[]

												return !!email
											})
											.map((r) => {
												const [email] = r.get('Email (from Listener Account)') as string[]

												return email
											}),
									},
								},
							})
						}

						// Lecturer
						const lecturerName = record['Lecturer Name'] as string[]
						let lecturer: any
						if (lecturerName?.length) {
							lecturer = await prisma.user.findFirst({ where: { name: lecturerName[0] } })
						}

						const createdLecture = await prisma.lecture.create({
							data: {
								name: record.Name as string,
								stage: record.Status as LectureStage,
								date: record.Date ? dayjs(record.Date).toISOString() : undefined,
								description: record.Description as string,
								wishes: record.Wishes as string,
								requestedById: userOfRequest?.id,
								directionId: direction!.id,
								isArchived: record.Archived as boolean,
								duration: record.Duration ? (record.Duration as number) / 60 : undefined,
								linkToStream: record.Link as string,
								recordLink: record['Youtube Video ID'] as string,
								createdAt: dayjs(record.Created).toISOString(),
								updatedAt: dayjs(record['Last Modified']).toISOString(),
								lecturerRequests: {
									create: lecturer
										? {
												userId: lecturer!.id,
												isSpeaker: true,
												createdAt: dayjs(record.Created).toISOString(),
												updatedAt: dayjs(record['Last Modified']).toISOString(),
												duration: record.Duration ? (record.Duration as number) / 60 : undefined,
												date: record.Date ? dayjs(record.Date).toISOString() : undefined,
												curriculum: record.Description as string,
												linkToStream: record.Link as string,
												directionId: direction!.id,
											}
										: undefined,
								},
								listeners:
									airtableListeners.length > 0
										? {
												createMany: {
													data: airtableListeners
														.filter((r) => {
															const email = r.get('Email (from Listener Account)') as string[]

															return !!email
														})
														.map((airtableListener) => {
															const [email] = airtableListener.get('Email (from Listener Account)') as string[]
															const user = listeners.find((r) => r.email == email)

															return {
																userId: user!.id,
																createdAt: dayjs(airtableListener.fields.Created as string).toISOString(),
																updatedAt: dayjs(airtableListener.fields.Created as string).toISOString(),
															}
														}),
												},
											}
										: undefined,
							},
						})

						if (createdLecture) {
							newRecordsCount++
						}
					}

					if (newRecordsCount > 0) {
						console.log('Lectures were inserted', newRecordsCount)
					}

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

	console.info('Lecture transfer has finised')
}
