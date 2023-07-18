import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Body, Delete, Get, Put, Query, Req, createHandler } from 'next-api-decorators'

class ParamsDto {
	@IsString()
	id: string
}

@NextAuthGuard('user', ['Admin'])
class ApiSeasonStagesAdminHandler {
	constructor() {}

	@Get()
	public async get(@Query() params: ParamsDto) {
		const season = await prisma.season.findFirst({ where: { id: params.id } })

		return season
	}

	@Put()
	public async update(@Req() req: NextApiRequestWithUser, @Query() params: ParamsDto, @Body() body: any) {
		const { id, ...data } = body
		await prisma.season.update({ where: { id: params.id }, data })
	}

	@Delete()
	public async delete(@Req() req: NextApiRequestWithUser, @Query() params: ParamsDto) {
		await prisma.season.delete({ where: { id: params.id } })
	}
}

export default createHandler(ApiSeasonStagesAdminHandler)
