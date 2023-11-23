import { ExtendedPrismaClient } from '@/services/prisma'
import { SkillLevel, UserRole } from '@prisma/client'
import { AirtableBase } from 'airtable/lib/airtable_base'
import dayjs from 'dayjs'
import { trim } from 'voca'

export const transferAccounts = async (airtableService: AirtableBase, prisma: ExtendedPrismaClient) => {
	const workDirections = await prisma.workDirection.findMany()

	await airtableService('Accounts')
		.select({
			pageSize: 100,
			// maxRecords: 10,
			sort: [{ field: 'Created', direction: 'asc' }],
		})
		.eachPage(
			async (records, fetchNextPage) => {
				let countCreatedRecords = 0

				if (records.length) {
					for (const record of records) {
						try {
							const existedUser = await prisma.user.findFirst({ where: { email: record.get('Email') as string } })

							if (existedUser) continue

							/** PROFILE */
							const [profile] = await airtableService('Profiles')
								.select({
									maxRecords: 1,
									filterByFormula: `FIND("${record.get('Email') as string}", {Email (from Account)})`,
								})
								.all()

							// Convert Time For Work to number[]
							const timeForWorkString = profile.get('Time For Work') as string
							const timeForWorkArr: string[] = timeForWorkString?.length > 0 ? timeForWorkString.split('-') : []
							let timeForWork: number[] | undefined = undefined
							if (timeForWorkArr.length == 2) {
								timeForWork = [+timeForWorkArr[0], +timeForWorkArr[1]]
							}

							/** SPECIALITIES */
							const specialities = await airtableService('Specialities')
								.select({
									filterByFormula: `FIND("${profile.id}", {Profile ID})`,
									sort: [{ field: 'Created', direction: 'desc' }],
								})
								.all()

							/** Preffered Fields */
							let preferredGenres = profile.get('Preferred Genres') as string[]
							let preferredLevels = profile.get('Preferred Difficulty Levels') as string[]
							let preferredSettings = profile.get('Preferred Settings') as string[]

							preferredGenres = preferredGenres?.map((item) => {
								let [, name] = item.split('/')
								name = trim(name.toLowerCase())

								switch (name) {
									case 'first person shooter(FPS)':
										name = 'fps'
										break
									case 'real time strategy (RTS)':
										name = 'rts'
										break
									case 'turn based strategy':
										name = 'tbs'
										break
									case 'role playing games (RPG)':
										name = 'rpg'
										break
									case 'massively multiplayer online role playing game (MMORPG)':
										name = 'mmorpg'
										break
									case 'others':
										name = 'other'
										break
								}

								return name
							})

							preferredLevels = preferredLevels?.map((item) => {
								let [, name] = item.split('/')
								name = trim(name.toLowerCase())

								return name
							})

							preferredSettings = preferredSettings?.map((item) => {
								let [, name] = item.split('/')
								name = trim(name.toLowerCase())

								return name
							})

							const createdUser = await prisma.user.create({
								data: {
									email: record.get('Email') as string,
									name: (record.get('Name') as string)[0],
									image: record.get('Image Link') as string,
									roles: record.get('Roles') as UserRole[],
									emailVerified: dayjs(record.get('Created') as string).toISOString(),
									createdAt: dayjs(record.get('Created') as string).toISOString(),
									updatedAt: dayjs(record.get('Last Modified') as string).toISOString(),
									profile: {
										create: {
											name: profile.get('Name') as string,
											tgNickname: profile.get('Telegram Nickname') as string,
											country: profile.get('Country') as string,
											city: profile.get('City') as string,
											timeForWork,
											preferredGenres: {
												connectOrCreate: preferredGenres?.map((name) => ({
													where: { name },
													create: { name },
												})),
											},
											preferredLevels: {
												connectOrCreate: preferredLevels?.map((name) => ({
													where: { name },
													create: { name },
												})),
											},
											preferredSettings: {
												connectOrCreate: preferredSettings?.map((name) => ({
													where: { name },
													create: { name },
												})),
											},
										},
									},
									specialities: {
										createMany: {
											data: specialities.map((speciality) => {
												let level: SkillLevel | undefined = undefined
												switch (speciality.get('Level')) {
													case 'Новичок / Novice':
														level = SkillLevel.Novice
														break
													case 'Начинающий / Beginner':
														level = SkillLevel.Beginner
														break
													case 'Умеющий / Skillful':
														level = SkillLevel.Skillful
														break
													case 'Опытный / Experienced':
														level = SkillLevel.Experienced
														break
													case 'Эксперт / Expert':
														level = SkillLevel.Expert
														break
													default:
														level = SkillLevel.Skillful
												}

												let workDirectionId: string | undefined = undefined
												switch (speciality.get('Direction')) {
													case 'Programming':
														workDirectionId = workDirections.find((r) => r.name == 'development')?.id
														break
													case 'Programming (web)':
														workDirectionId = workDirections.find((r) => r.name == 'web development')?.id
														break
													case 'Game Design':
														workDirectionId = workDirections.find((r) => r.name == 'game design')?.id
														break
													case '2D Art & Animation':
														workDirectionId = workDirections.find((r) => r.name == '2d art & animation')?.id
														break
													case '3D Art & Animation':
														workDirectionId = workDirections.find((r) => r.name == '3d art & animation')?.id
														break
													case 'Management':
														workDirectionId = workDirections.find((r) => r.name == 'management')?.id
														break
													case 'Game Writer':
														workDirectionId = workDirections.find((r) => r.name == 'game writer')?.id
														break
													case 'Learning':
														workDirectionId = workDirections.find((r) => r.name == 'learning')?.id
														break
													case 'Technical Art':
														workDirectionId = workDirections.find((r) => r.name == 'technical art')?.id
														break
													case 'Sound Design':
														workDirectionId = workDirections.find((r) => r.name == 'music & sound')?.id
														break
													case 'Marketing':
														workDirectionId = workDirections.find((r) => r.name == 'marketing')?.id
														break
													case 'VFX Art':
														workDirectionId = workDirections.find((r) => r.name == 'vfx')?.id
														break
													case 'Quality Assurance':
														workDirectionId = workDirections.find((r) => r.name == 'qa')?.id
														break
													case 'Human Resources':
														workDirectionId = workDirections.find((r) => r.name == 'hr')?.id
														break
													case 'Video Editing':
														workDirectionId = workDirections.find((r) => r.name == 'video editing')?.id
														break
													case 'Backend/Server-side development':
														workDirectionId = workDirections.find((r) => r.name == 'backend development')?.id
														break
													case 'Investment':
														workDirectionId = workDirections.find((r) => r.name == 'investment')?.id
														break

													default:
														workDirectionId = workDirections.find((r) => r.name == 'other')?.id
												}

												return {
													name: speciality.get('Name') as string,
													specialization: (speciality.get('Specialization') as string) || '',
													level: level!,
													workDirectionId: workDirectionId!,
													portfolioUrl: profile.get('Resume/Portfolio') as string,
													skills: profile.get('Skills') as string,
													tools: profile.get('Tools') as string,
													jobs: profile.get('Workplaces') as string,
													schools: profile.get('Schools') as string,
													createdAt: dayjs(speciality.get('Created') as string).toISOString(),
													updatedAt: dayjs(speciality.get('Last Modified') as string).toISOString(),
												}
											}),
										},
									},
								},
							})
							if (createdUser) {
								countCreatedRecords++

								console.log(`user`, createdUser.id, createdUser.email)
							}
						} catch (err: any) {
							console.error(err.message)
						}
					}

					if (countCreatedRecords > 0) {
						console.info('Users was transferd:', countCreatedRecords)
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
