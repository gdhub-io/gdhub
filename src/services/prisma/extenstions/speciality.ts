import { SearchEngineService } from '@/services/typesense'
import { Prisma } from '@prisma/client'

export const profilePrismaExtenstion = Prisma.defineExtension((client) => {
	return client.$extends({
		name: 'speciality-extenstion',
		query: {
			speciality: {
				create: async ({ args, query }) => {
					const speciality = await query(args)

					/** Update data in search engine */
					if (speciality.id) {
						try {
							const searchClient = await SearchEngineService.init()
							await searchClient.addSpecialist(speciality)
						} catch (error) {
							console.log(`New record for search engine was not save (id=${speciality.id})`, error)
						}
					}

					return speciality
				},
				update: async ({ args, query }) => {
					const speciality = await query(args)

					/** Update data in search engine */
					if (speciality.id) {
						try {
							const searchClient = await SearchEngineService.init()
							await searchClient.updateSpecialist(speciality.id, speciality)
						} catch (error) {
							console.log(`New record for search engine was not save (id=${speciality.id})`, error)
						}
					}

					return speciality
				},
				delete: async ({ args, query }) => {
					const data = await client.speciality.findUnique({ where: { id: args.where.id } })
					const speciality = await query(args)

					/** Update data in search engine */
					if (data && args.where.id) {
						try {
							// set onboardingDone to false for users without specialities
							const specialtiesLeft = await client.speciality.count({ where: { id: args.where.id } })

							if (specialtiesLeft == 0) {
								await client.user.update({
									where: { id: data?.userId },
									data: { onboardingDone: false },
								})
							}

							const searchClient = await SearchEngineService.init()
							await searchClient.deleteSpecialist(args.where.id)
						} catch (error) {
							console.log(`New record for search engine was not delete (id=${args.where.id})`, error)
						}
					}

					return speciality
				},
			},
		},
	})
})
