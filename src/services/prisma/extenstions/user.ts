import { Prisma } from '@prisma/client'

export const userPrismaExtension = Prisma.defineExtension((client) => {
	return client.$extends({
		name: 'user-extenstion',
		model: {
			user: {
				existProfile: async (userId: string) => {
					const existProfile = await client.profile.count({ where: { userId } })

					return !!existProfile
				},
			},
		},
	})
})
