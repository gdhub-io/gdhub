import { PrismaClient } from '@prisma/client'

export const seedGameDifficultyLevels = async (prisma: PrismaClient) => {
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
