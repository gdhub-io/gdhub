import { env } from '@/helpers/env'
import { PrismaClient } from '@prisma/client'
import { healthExtension } from './extenstions/health'
import { profilePrismaExtenstion } from './extenstions/profile'
import { projectPrismaExtension } from './extenstions/project'
import { seasonPrismaExtension } from './extenstions/season'
import { userPrismaExtension } from './extenstions/user'

declare global {
	// eslint-disable-next-line no-var
	var cachedPrisma: ExtendedPrismaClient
}

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
		.$extends(projectPrismaExtension)

	return extendedPrisma
}

export type ExtendedPrismaClient = ReturnType<typeof extendedPrismaClient>

let prisma: ReturnType<typeof extendedPrismaClient>

if (process.env.NODE_ENV === 'production') {
	prisma = extendedPrismaClient()
} else {
	if (!global.cachedPrisma) {
		global.cachedPrisma = extendedPrismaClient()
	}

	prisma = global.cachedPrisma
}

export { prisma }
