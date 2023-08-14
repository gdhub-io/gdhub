import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { TeamVacancyStatus } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Body, Delete, Get, Post, Put, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class IDParamDto {
	@IsString()
	id: string
}

class UserTeamVacancyCreateDto {
	@IsString()
	title: string
	@IsString()
	description: string
	@IsString()
	directionId: string
	@IsEnum(TeamVacancyStatus)
	status: TeamVacancyStatus
	@IsString()
	@IsOptional()
	publishedAt?: string
	@IsString()
	finishedAt: string
	@IsString()
	teamId: string
}

class UserTeamVacancyUpdateDto {
	@IsString()
	id: string
	@IsString()
	title: string
	@IsString()
	description: string
	@IsString()
	directionId: string
	@IsEnum(TeamVacancyStatus)
	status: TeamVacancyStatus
	@IsString()
	@IsOptional()
	publishedAt?: string
	@IsString()
	finishedAt: string
}

@NextAuthGuard('user')
class ApiUserTeamVacancyHandler {
	@Get()
	public async get(@Query(ValidationPipe) { id }: IDParamDto) {
		const vacancy = await prisma.teamVacancy.findFirst({
			where: { id },
			// include: {
			// 	team: {
			// 		select: { project: { select: { name: true, stage: { select: { season: { select: { name: true } } } } } } },
			// 	},
			// },
		})

		return vacancy
	}

	@Post()
	public async create(@Body(ValidationPipe) data: UserTeamVacancyCreateDto) {
		await prisma.teamVacancy.create({ data })
	}

	@Put()
	public async update(@Query(ValidationPipe) { id }: IDParamDto, @Body(ValidationPipe) data: UserTeamVacancyUpdateDto) {
		//update
	}

	@Delete()
	public async delete(@Query(ValidationPipe) { id }: IDParamDto) {
		//delete
	}
}

export default createHandler(ApiUserTeamVacancyHandler)
