import { prisma } from '@/services/prisma'
import { seedGameDifficultyLevels } from './seeds/game-difficulties'
import { seedGameGenres } from './seeds/game-genres'
import { seedGameSettings } from './seeds/game-settings'
import { seedDefaultSeasons } from './seeds/seasons'
import { seedWorkDirections } from './seeds/work-directions'

async function main() {
	await seedGameGenres(prisma)
	console.log('Game Genres were sown')

	await seedGameSettings(prisma)
	console.log('Game Settings were sown')

	await seedGameDifficultyLevels(prisma)
	console.log('Game Difficulty Level were sown')

	await seedWorkDirections(prisma)
	console.log('Work directions were sown')

	await seedDefaultSeasons(prisma)
	console.log('Seasons were sown')
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
