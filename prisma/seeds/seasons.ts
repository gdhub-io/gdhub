import { ExtendedPrismaClient } from '@/services/prisma'
import { Prisma } from '@prisma/client'
import dayjs from 'dayjs'

// const defaultIndieStages = [
// 	{ name: 'Recruiting', order: 0 },
// 	{ name: 'Prototyping', order: 1 },
// 	{ name: 'Production', order: 2 },
// 	{ name: 'SoftLaunch', order: 3 },
// 	{ name: 'Release', order: 4 },
// ]
const defaultIndieStages = [
	'concept',
	'pre-planning',
	'recruiting',
	'prototyping',
	'marketing',
	'development',
	'testing',
	'polishing',
	'release',
	'support',
	'closing',
]

export const seedDefaultSeasons = async (prisma: ExtendedPrismaClient) => {
	const newStages: Prisma.SeasonStageCreateWithoutSeasonInput[] = []
	const existSeason = await prisma.season.findFirst({
		where: { name: 'Indie' },
		include: { stages: { orderBy: { order: 'asc' } } },
	})

	if (existSeason) {
		console.log('Indie season already exists.')

		for (const [index, stageName] of defaultIndieStages.entries()) {
			const existStage = existSeason.stages.find((stage) => stage.name == stageName)

			if (!existStage) {
				newStages.push({ name: stageName, order: index })
			}
		}

		console.log('Indie season was updated.')

		return newStages
			? prisma.$transaction([
					prisma.season.update({
						where: { id: existSeason.id },
						data: {
							stages: {
								create: newStages,
							},
						},
					}),
				])
			: undefined
	}

	return prisma.$transaction([
		prisma.season.create({
			data: {
				name: 'Indie',
				slug: 'indie',
				startedAt: dayjs().toISOString(),
				description: 'Default pipeline for indie teams',
				stages: {
					create: newStages,
				},
			},
		}),
	])
}
