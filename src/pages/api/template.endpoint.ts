import { NextAuthGuard } from '@/lib/api-middlewares'
import { IsString } from 'class-validator'
import { Body, Delete, Get, Post, Put, Query, ValidationPipe, createHandler } from 'next-api-decorators'

class IDParamDto {
	@IsString()
	id: string
}

class TemplateCreateDto {
	@IsString()
	name: string
}

class TemplateUpdateDto {
	@IsString()
	name: string
}

@NextAuthGuard('user')
class ApiTemplateEndpointHandler {
	@Get()
	public async get(@Query(ValidationPipe) { id }: IDParamDto) {
		// get data
	}

	@Post()
	public async create(@Body(ValidationPipe) data: TemplateCreateDto) {
		//create
	}

	@Put()
	public async update(@Query(ValidationPipe) { id }: IDParamDto, @Body(ValidationPipe) data: TemplateUpdateDto) {
		//update
	}

	@Delete()
	public async delete(@Query(ValidationPipe) { id }: IDParamDto) {
		//delete
	}
}

export default createHandler(ApiTemplateEndpointHandler)
