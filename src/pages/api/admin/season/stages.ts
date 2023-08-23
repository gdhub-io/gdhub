import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UserRole } from '@prisma/client'
import { IsString } from 'class-validator'
import { Get, Query, createHandler } from 'next-api-decorators'

class ParamsDto {
	@IsString()
	seasonId: string
}

@NextAuthGuard('user', [UserRole.Admin])
class ApiSeasonStagesAdminHandler {
	constructor() {}

	@Get()
	public async list(@Query() { seasonId }: ParamsDto) {
		const stages = await prisma.seasonStage.findMany({
			where: { seasonId },
			orderBy: { order: 'asc' },
		})

		return stages
	}
}

export default createHandler(ApiSeasonStagesAdminHandler)
