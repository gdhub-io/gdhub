import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UserRole } from '@prisma/client'
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator'
import { Body, Delete, Get, Post, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamsDto {
	@IsString()
	id: string
}

class CreateSeasonStageDto {
	@IsString()
	name: string
	@IsString()
	@IsOptional()
	description?: string
	@IsBoolean()
	isCurrent: boolean
	@IsDateString()
	startedAt: string
	@IsDateString()
	@IsOptional()
	finishedAt?: string
	@IsString()
	seasonId: string
}

@NextAuthGuard('user', [UserRole.Admin])
class ApiSeasonStageAdminHandler {
	constructor() {}

	@Get()
	public async get(@Query() params: ParamsDto) {
		const response = await prisma.seasonStage.findFirst({ where: { id: params.id } })

		return response
	}

	@Post()
	public async post(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: CreateSeasonStageDto) {
		const response = await prisma.seasonStage.create({ data })

		return response
	}

	@Put()
	public async update(@Req() req: NextApiRequestWithUser, @Query() params: ParamsDto, @Body() body: any) {
		const { id, ...data } = body
		return await prisma.seasonStage.update({ where: { id: params.id }, data })
	}

	@Delete()
	public async delete(@Req() req: NextApiRequestWithUser, @Query() params: ParamsDto) {
		return await prisma.seasonStage.delete({ where: { id: params.id } })
	}
}

export default createHandler(ApiSeasonStageAdminHandler)
