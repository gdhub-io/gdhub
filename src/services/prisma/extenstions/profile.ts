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

					if (args.data.name) {
						await prisma.user.update({ where: { id: profile.userId }, data: { name: profile.name } })
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
