import { seedGameDifficultyLevels } from './seeds/game-difficulties'
import { seedGameGenres } from './seeds/game-genres'
import { seedGameSettings } from './seeds/game-settings'
import { PrismaService } from '../src/services/prisma'

const prisma = PrismaService.getInstance()

async function main() {
	await seedGameGenres(prisma.client)
	console.log('Game Genres was added')

	await seedGameSettings(prisma.client)
	console.log('Game Settings was added')

	await seedGameDifficultyLevels(prisma.client)
	console.log('Game Difficulty Level was added')
}

main()
	.then(async () => {
		await prisma.client.$disconnect()
	})
	.catch(async (e) => {
		console.error(e)
		await prisma.client.$disconnect()
		process.exit(1)
	})
