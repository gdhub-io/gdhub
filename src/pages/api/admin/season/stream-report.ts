import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UserRole } from '@prisma/client'
import { IsDateString, IsString } from 'class-validator'
import { Body, Delete, Get, Post, Put, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class ParamsDto {
	@IsString()
	id: string
}

class CreateSeasonStreamReportDto {
	@IsDateString()
	date: string
	@IsString()
	stageId: string
}

@NextAuthGuard('user', [UserRole.Admin])
class ApiSeasonStreamReportAdminHandler {
	constructor() {}

	@Get()
	public async get(@Query() params: ParamsDto) {
		const response = await prisma.seasonStreamReport.findFirst({
			where: { id: params.id },
			include: { stage: { select: { id: true, name: true, season: { select: { id: true, name: true } } } } },
		})

		return response
	}

	@Post()
	public async post(@Body(ValidationPipe) data: CreateSeasonStreamReportDto) {
		const response = await prisma.seasonStreamReport.create({ data })

		return response
	}

	@Put()
	public async update(@Query() params: ParamsDto, @Body() body: any) {
		const { id, ...data } = body
		return await prisma.seasonStreamReport.update({ where: { id: params.id }, data })
	}

	@Delete()
	public async delete(@Query() params: ParamsDto) {
		return await prisma.seasonStreamReport.delete({ where: { id: params.id } })
	}
}

export default createHandler(ApiSeasonStreamReportAdminHandler)
