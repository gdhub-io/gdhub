import { env } from '@/helpers/env'
import { PrismaClient } from '@prisma/client'
import { healthExtension } from './extenstions/health'
import { profilePrismaExtenstion } from './extenstions/profile'
import { seasonPrismaExtension } from './extenstions/season'
import { userPrismaExtension } from './extenstions/user'

const extendedPrismaClient = () => {
	const prisma = new PrismaClient({
		datasourceUrl: env('POSTGRES_PRISMA_URL'),
		log: process.env.DEBUG ? ['query', 'error'] : ['error'],
		errorFormat: 'pretty',
	})

	const extendedPrisma = prisma
		.$extends(healthExtension)
		.$extends(userPrismaExtension)
		.$extends(profilePrismaExtenstion)
		.$extends(seasonPrismaExtension)

	return extendedPrisma
}

export type ExtendedPrismaClient = ReturnType<typeof extendedPrismaClient>

const globalForPrisma = globalThis as unknown as {
	prisma: ExtendedPrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? extendedPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
