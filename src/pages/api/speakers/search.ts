import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsArray, IsOptional, IsString } from 'class-validator'
import { Get, Query, createHandler, Req } from 'next-api-decorators'

class SearchQueryDto {
	@IsString()
	query: string

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	ids?: string[]
}

@NextAuthGuard('user')
class ApiSpeakersSearchHandler {
	@Get()
	async search(@Req() req: any, @Query() { query, ids }: SearchQueryDto) {
		// if (!req.user?.roles?.includes(prismaClient.UserRole.Admin)) {
		// 	return []
		// }

		// if (!query) return []

		console.log('ids', ids)

		const q = query.trim()

		const specialities = await prisma.speciality.findMany({
			where: q
				? {
						OR: [
							{ user: { name: { contains: q, mode: 'insensitive' } } },
							{ user: { profile: { name: { contains: q, mode: 'insensitive' } } } },
							{ name: { contains: q, mode: 'insensitive' } },
							{ user: { id: req.user?.id } },
						],
					}
				: {
						OR: [{ user: { id: req.user?.id } }, { id: ids ? { in: Array.isArray(ids) ? ids : [ids] } : undefined }],
					},
			include: {
				user: true,
				direction: true,
			},
			take: 20,
			orderBy: { updatedAt: 'desc' },
		})

		return specialities.map((s) => ({
			id: s.id,
			name: s.user?.name || '',
			image: s.user?.image || '',
			speciality: s.name,
			direction: s.direction?.name || '',
		}))
	}
}

export default createHandler(ApiSpeakersSearchHandler)
