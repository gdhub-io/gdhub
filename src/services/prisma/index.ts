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

export class PrismaService {
	private static instance: PrismaService
	public client: ExtendedPrismaClient

	private constructor() {
		this.client = extendedPrismaClient()
	}

	public static getInstance(): PrismaService {
		if (!PrismaService.instance) {
			PrismaService.instance = new PrismaService()
		}

		return PrismaService.instance
	}
}
