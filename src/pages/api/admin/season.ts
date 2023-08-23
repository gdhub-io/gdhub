import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { SeasonStatus, UserRole } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator'
import { Body, Delete, Get, Post, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamsDto {
	@IsString()
	id: string
}

class CreateSeasonDto {
	@IsString()
	name: string
	@IsString()
	@IsOptional()
	description?: string
	@IsString()
	slug: string
	@IsEnum(SeasonStatus)
	status: SeasonStatus
	@IsDateString()
	startedAt: string
	@IsDateString()
	@IsOptional()
	finishedAt?: string
}

@NextAuthGuard('user', [UserRole.Admin])
class ApiSeasonAdminHandler {
	constructor() {}

	@Get()
	public async get(@Query() params: ParamsDto) {
		const season = await prisma.season.findFirst({ where: { id: params.id } })

		return season
	}

	@Post()
	public async post(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: CreateSeasonDto) {
		const seasons = await prisma.season.create({ data })

		return seasons
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

export default createHandler(ApiSeasonAdminHandler)
