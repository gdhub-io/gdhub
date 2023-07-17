import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Get, Query, createHandler } from 'next-api-decorators'

class ParamsDto {
	@IsString()
	id: string
}

@NextAuthGuard('user', ['Admin'])
class ApiSeasonStagesAdminHandler {
	constructor() {}

	@Get()
	public async list(@Query() params: ParamsDto) {
		const stages = await prisma.seasonStage.findMany({ where: { seasonId: params.id } })

		return stages
	}
}

export default createHandler(ApiSeasonStagesAdminHandler)
