import { PrismaClient } from '@prisma/client'
import dayjs from 'dayjs'

const extendedPrismaClient = () => {
	const prisma = new PrismaClient({
		log: process.env.DEBUG ? ['query', 'error'] : ['error'],
	})

	const extendedPrisma = prisma.$extends({
		model: {
			user: {
				existProfile: async (userId: string) => {
					const existProfile = await prisma.profile.count({ where: { userId } })

					return !!existProfile
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

	return extendedPrisma
}

export type ExtendedPrismaClient = ReturnType<typeof extendedPrismaClient>

const globalForPrisma = globalThis as unknown as {
	prisma: ExtendedPrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? extendedPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
