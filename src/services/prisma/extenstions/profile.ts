import { SearchEngineService } from '@/services/typesense'
import { Prisma } from '@prisma/client'
import dayjs from 'dayjs'
import { prisma } from '..'

export const profilePrismaExtenstion = Prisma.defineExtension((client) => {
	return client.$extends({
		name: 'profile-extenstion',
		query: {
			profile: {
				update: async ({ args, query }) => {
					const profile = await query(args)

					/** Update user name on updating name of in profile */
					if (args.data.name) {
						await prisma.user.update({ where: { id: profile.userId }, data: { name: profile.name } })
					}

					/** Update search data for the user */
					if (args.data.isActive || args.data.country || args.data.city) {
						try {
							const specialities = await client.speciality.findMany({ where: { userId: profile.userId } })
							const searchClient = await SearchEngineService.init()

							for (const speciality of specialities) {
								await searchClient.updateSpecialist(speciality.id, {
									...speciality,
									isActive: profile.isActive,

									country: profile.country,
									city: profile.city,
								})
							}
						} catch (error) {
							console.log(`New record for search engine was not save`, error)
						}
					}

					return profile
				},
			},
		},
		result: {
			profile: {
				createdAt: {
					needs: { createdAt: true },
					compute: (model) => dayjs(model.createdAt).toISOString(),
				},
				updatedAt: {
					needs: { updatedAt: true },
					compute: (model) => dayjs(model.updatedAt).toISOString(),
				},
			},
		},
	})
})
