import { seedGameDifficultyLevels } from './seeds/game-difficulties'
import { seedGameGenres } from './seeds/game-genres'
import { seedGameSettings } from './seeds/game-settings'
import { prisma } from '../src/services/prisma'
import { seedWorkDirections } from './seeds/work-directions'

async function main() {
	await seedGameGenres(prisma)
	console.log('Game Genres was added')

	await seedGameSettings(prisma)
	console.log('Game Settings was added')

	await seedGameDifficultyLevels(prisma)
	console.log('Game Difficulty Level was added')

	await seedWorkDirections(prisma)
	console.log('Word directions was added')
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async (e) => {
		console.error(e)
		await prisma.$disconnect()
		process.exit(1)
	})
