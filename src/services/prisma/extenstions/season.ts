import { prisma } from '@/services/prisma'
import { Prisma, Season, SeasonStage } from '@prisma/client'

enum DefaultSeasonStages {
	Searching,
	PreProduction,
	Recruiting,
	Prototyping,
	Production,
	Pitching,
}

export const seasonPrismaExtension = Prisma.defineExtension((client) => {
	return client.$extends({
		name: 'season-extenstion',
		query: {
			season: {
				create: async ({ args, query }) => {
					const season = await query(args)
					const defaultStages = Object.values(DefaultSeasonStages)
						.filter((v) => !Number.isInteger(v))
						.map((v, idx) => ({ name: v as string, order: idx }))

					const seasonWithStages: Season & { stages?: SeasonStage[] } = await prisma.season.update({
						where: { id: season.id },
						data: { stages: { createMany: { data: defaultStages } } },
						include: { stages: true },
					})

					return seasonWithStages
				},
			},
		},
	})
})
