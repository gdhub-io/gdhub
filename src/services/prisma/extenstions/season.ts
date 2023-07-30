import { DefaultSeasonStages } from '@/types/enums'
import { Prisma, Season, SeasonStage } from '@prisma/client'

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

					const seasonWithStages: Season & { stages?: SeasonStage[] } = await client.season.update({
						where: { id: season.id },
						data: { stages: { createMany: { data: defaultStages } } },
						include: { stages: true },
					})

					return seasonWithStages
				},
			},
			seasonStage: {
				$allOperations: async ({ args, query, operation }) => {
					const response: any = await query(args)

					if (['create', 'update', 'upsert'].includes(operation)) {
						const _args = args as any
						if (response && _args?.data.isCurrent) {
							await client.seasonStage.updateMany({
								where: { seasonId: response.seasonId, id: { not: { equals: response.id } } },
								data: { isCurrent: false },
							})
						}
					}

					return response
				},
			},
		},
	})
})
export { DefaultSeasonStages }
