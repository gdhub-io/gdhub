import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { IsString } from 'class-validator'
import { Body, Delete, Get, Post, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class IDParamDto {
	@IsString()
	id: string
}

class UserEventCreateDto {
	@IsString()
	name: string
}

class UserEventUpdateDto {
	@IsString()
	name: string
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
	public async create(@Body(ValidationPipe) data: UserEventCreateDto) {
		//create
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
