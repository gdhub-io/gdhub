import { prisma } from '@/services/prisma'
import { seedGameDifficultyLevels } from './seeds/game-difficulties'
import { seedGameGenres } from './seeds/game-genres'
import { seedGameSettings } from './seeds/game-settings'
import { seedDefaultSeasons } from './seeds/seasons'
import { seedSubscriptionPlan } from './seeds/subscription-plans'
import { seedWorkDirections } from './seeds/work-directions'

async function main() {
	const seed = process.argv[2]

	if (!seed || seed == 'game-genres') {
		await seedGameGenres(prisma)
		console.log('Game Genres were sown')
	}

	if (!seed || seed == 'game-settings') {
		await seedGameSettings(prisma)
		console.log('Game Settings were sown')
	}

	if (!seed || seed == 'game-levels') {
		await seedGameDifficultyLevels(prisma)
		console.log('Game Difficulty Level were sown')
	}

	if (!seed || seed == 'work-directions') {
		await seedWorkDirections(prisma)
		console.log('Work directions were sown')
	}

	if (!seed || seed == 'default-seasons') {
		await seedDefaultSeasons(prisma)
		console.log('Seasons were sown')
	}

	if (!seed || seed == 'subscription-plans') {
		await seedSubscriptionPlan(prisma)
		console.log('Subscription plans were sown')
	}
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
