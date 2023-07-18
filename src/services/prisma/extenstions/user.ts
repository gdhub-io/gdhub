import { prisma } from '@/services/prisma'
import { Prisma } from '@prisma/client'

export const userPrismaExtension = Prisma.defineExtension((client) => {
	return client.$extends({
		name: 'user-extenstion',
		model: {
			user: {
				existProfile: async (userId: string) => {
					const existProfile = await prisma.profile.count({ where: { userId } })

					return !!existProfile
				},
			},
		},
	})
})
