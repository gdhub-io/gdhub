import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { SeasonStatus } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator'
import { Body, Post, Req, ValidationPipe, createHandler } from 'next-api-decorators'

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

@NextAuthGuard('user', ['Admin'])
class ApiSeasonAdminHandler {
	constructor() {}

	@Post()
	public async post(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: CreateSeasonDto) {
		const seasons = await prisma.season.create({ data })

		return seasons
	}
}

export default createHandler(ApiSeasonAdminHandler)
