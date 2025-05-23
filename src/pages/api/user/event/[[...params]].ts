import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Type } from 'class-transformer'
import { IsArray, IsDate, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator'
import { Body, Delete, Get, Post, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class IDParamDto {
	@IsString()
	id: string
}

class UserEventCreateDto {
	@IsString()
	title: string

	@IsString()
	description: string

	@IsString()
	@IsOptional()
	link?: string

	@IsString()
	@IsOptional()
	image?: string

	@IsString()
	@IsEnum(prismaClient.EventType)
	type: prismaClient.EventType

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => UserEventScheduleItemDto)
	schedule: UserEventScheduleItemDto[]
}

class UserEventScheduleItemDto {
	@IsString()
	@IsOptional()
	title?: string

	@IsString()
	@IsOptional()
	description?: string

	@IsString()
	@IsOptional()
	link?: string

	@IsDate()
	@IsOptional()
	startDate?: Date

	@IsDate()
	@IsOptional()
	endDate?: Date

	@IsArray()
	@IsString({ each: true })
	speakers: string[]
}

class UserEventUpdateDto {
	@IsString()
	title: string
}

@NextAuthGuard('user')
class ApiUserEventEndpointHandler {
	@Get()
	public async get(@Query(ValidationPipe) { id }: IDParamDto) {
		// get data
	}

	@Get('/count')
	public async count(@Req() req: NextApiRequestWithUser) {
		// return prisma.event.count({
		// 	where: {
		// 		createdById: req.user.id,
		// 	},
		// })

		return 0
	}

	@Post()
	public async create(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: UserEventCreateDto) {
		await prisma.event.create({
			data: {
				type: data.type,
				title: data.title,
				description: data.description,
				url: data.link,
				image: data.image,
				createdById: req.user.id,
			},
		})
	}

	@Put()
	public async update(@Query(ValidationPipe) { id }: IDParamDto, @Body(ValidationPipe) data: UserEventUpdateDto) {
		//update
	}

	@Delete()
	public async delete(@Query(ValidationPipe) { id }: IDParamDto) {
		//delete
	}
}

export default createHandler(ApiUserEventEndpointHandler)
