import { ExtendedPrismaClient } from '@/services/prisma'

export const seedGameDifficultyLevels = async (prisma: ExtendedPrismaClient) => {
	return prisma.$transaction([
		prisma.gameDifficultyLevel.deleteMany(),
		prisma.gameDifficultyLevel.createMany({
			data: [
				{ name: 'hyper-casual' },
				{ name: 'casual' },
				{ name: 'mid-core' },
				{ name: 'hard-core' },
				{ name: 'other' },
			],
		}),
	])
}
