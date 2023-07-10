import { ExtendedPrismaClient } from '@/services/prisma'

export const seedGameSettings = async (prisma: ExtendedPrismaClient) => {
	return prisma.$transaction([
		prisma.gameSetting.deleteMany(),
		prisma.gameSetting.createMany({
			data: [
				{ name: 'fairy' },
				{ name: 'fantasy' },
				{ name: 'oriental fantasy' },
				{ name: 'historic' },
				{ name: 'military' },
				{ name: 'real life' },
				{ name: 'aci-fi' },
				{ name: 'sport' },
				{ name: 'zombie' },
				{ name: 'other' },
			],
		}),
	])
}
