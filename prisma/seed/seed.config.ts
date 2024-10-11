import { prisma } from '@/services/prisma'
import { SeedPrisma } from '@snaplet/seed/adapter-prisma'
import { defineConfig } from '@snaplet/seed/config'

export default defineConfig({
	adapter: () => {
		return new SeedPrisma(prisma)
	},
	select: ['!*_prisma_migrations'],
})
