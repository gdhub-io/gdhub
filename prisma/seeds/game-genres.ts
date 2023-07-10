import { PrismaClient } from '@prisma/client'

export const seedGameGenres = async (prisma: PrismaClient) => {
	return prisma.$transaction([
		prisma.gameGenre.deleteMany(),
		prisma.gameGenre.createMany({
			data: [
				{ name: 'shooter' },
				{ name: 'fps' },
				{ name: 'adventure' },
				{ name: 'action-adventure' },
				{ name: 'rts' },
				{ name: 'tbs' },
				{ name: 'rpg' },
				{ name: 'mmorpg' },
				{ name: 'simulation' },
				{ name: 'sports' },
				{ name: 'dance' },
				{ name: 'puzzle' },
				{ name: 'platformer' },
				{ name: 'fighting' },
				{ name: 'survival horror' },
				{ name: 'other' },
			],
		}),
	])
}
