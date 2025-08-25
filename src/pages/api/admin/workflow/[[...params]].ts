import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { Prisma } from '@prisma/client'
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { Body, Delete, Get, Param, Post, Put, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class CreateWorkflowDto {
	@IsString()
	@IsNotEmpty()
	name: string

	@IsString()
	@IsNotEmpty()
	title: string

	@IsString()
	@IsOptional()
	description?: string

	@IsArray()
	@IsOptional()
	steps?: Prisma.InputJsonValue[]
}

class UpdateWorkflowDto {
	@IsString()
	@IsOptional()
	name?: string

	@IsString()
	@IsOptional()
	title?: string

	@IsString()
	@IsOptional()
	description?: string

	@IsArray()
	@IsOptional()
	steps?: Prisma.InputJsonValue[]
}

@NextAuthGuard('user', [prismaClient.UserRole.Admin])
class ApiWorkflowsAdminHandler {
	constructor() {}

	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) { name, title, description, steps }: CreateWorkflowDto
	) {
		const workflow = await prisma.workflowSchema.create({
			data: {
				name,
				title,
				description: description || undefined,
				steps: (steps ?? []) as Prisma.InputJsonValue[],
			},
		})

		return { id: workflow.id }
	}

	@Get('/:id')
	public async get(@Req() req: NextApiRequestWithUser, @Param('id') id: string) {
		const workflow = await prisma.workflowSchema.findUnique({
			where: { id },
		})

		return workflow
	}

	@Put('/:id')
	public async update(
		@Req() req: NextApiRequestWithUser,
		@Param('id') id: string,
		@Body(ValidationPipe) { name, title, description, steps }: UpdateWorkflowDto
	) {
		const workflow = await prisma.workflowSchema.update({
			where: { id },
			data: {
				name: name || undefined,
				title: title || undefined,
				description: description || undefined,
				steps: steps as Prisma.InputJsonValue[] | undefined,
			},
		})

		return workflow
	}

	@Delete('/:id')
	public async delete(@Req() req: NextApiRequestWithUser, @Param('id') id: string) {
		await prisma.workflowSchema.delete({ where: { id } })

		return { success: true }
	}
}

export default createHandler(ApiWorkflowsAdminHandler)
