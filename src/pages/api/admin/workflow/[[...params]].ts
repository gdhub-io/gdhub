import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { type JsonValue } from '@prisma/client/runtime/library'
import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'
import { Body, Delete, Get, Param, Post, Put, Req, ValidationPipe, createHandler } from 'next-api-decorators'
import slugify from 'slugify'

class CreateWorkflowDto {
	@IsString()
	@IsNotEmpty()
	@IsString()
	title: string

	@IsObject()
	@IsOptional()
	content?: JsonValue

	@IsString()
	@IsOptional()
	slug: string

	@IsArray()
	@IsOptional()
	authors?: { id: string }[]
}

class UpdateWorkflowDto {
	@IsString()
	@IsOptional()
	title?: string

	@IsObject()
	@IsOptional()
	content?: JsonValue

	@IsString()
	@IsOptional()
	slug?: string

	@IsArray()
	@IsOptional()
	authors?: { id: string }[]
}

@NextAuthGuard('user', [prismaClient.UserRole.Admin])
class ApiWorkflowsAdminHandler {
	constructor() {}

	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) { title, content, slug, authors }: CreateWorkflowDto
	) {
		const coverImage = (content as any)?.blocks?.find((block: any) => block.type === 'image')?.data?.file?.url as string

		const workflow = await prisma.workflowSchema.create({
			data: {
				title,
				content: content || {},
				image: coverImage || undefined,
				slug: slug || slugify(title, { lower: true, strict: true }),
				authors: { connect: authors?.map((author) => ({ id: author.id })) || [{ id: req.user.id }] },
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
		@Body(ValidationPipe) { title, content, slug, authors }: UpdateWorkflowDto
	) {
		const coverImage = (content as any)?.blocks?.find((block: any) => block.type === 'image')?.data?.file?.url as string

		const workflow = await prisma.workflowSchema.update({
			where: { id },
			data: {
				title: title || undefined,
				content: content || undefined,
				slug: slug || undefined,
				image: coverImage || undefined,
				authors: { connect: authors?.map((author) => ({ id: author.id })) || [] },
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
