import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UserRole } from '@prisma/client'
import { IsString } from 'class-validator'
import { Get, Query, createHandler } from 'next-api-decorators'

class ParamsDto {
	@IsString()
	id: string
}

@NextAuthGuard('user', [UserRole.Admin])
class ApiSeasonStagesAdminHandler {
	constructor() {}

	@Get()
	public async list(@Query() params: ParamsDto) {
		const stages = await prisma.seasonStage.findMany({ where: { seasonId: params.id }, orderBy: { order: 'asc' } })

		return stages
	}
}

export default createHandler(ApiSeasonStagesAdminHandler)
