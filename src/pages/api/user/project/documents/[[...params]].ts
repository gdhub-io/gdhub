import { NextAuthGuard } from '@/lib/api-middlewares'
import { ApiProjectTeamGuard } from '@/lib/api-project-guard'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Body, Delete, Get, Param, Post, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class GetListTeamDocumentParams {
	@IsString()
	teamId: string
}

class GetTeamDocumentParams {
	@IsString()
	teamId: string
}

class DeleteTeamDocumentParams {
	@IsString()
	teamId: string
}

class CreateTeamDocumentParams {
	@IsString()
	teamId: string

	@IsEnum(prismaClient.TeamDocumentType)
	type: prismaClient.TeamDocumentType

	@IsString()
	name: string

	@IsString()
	@IsOptional()
	description?: string

	@IsString()
	link: string
}

class UpdateTeamDocumentParams {
	@IsEnum(prismaClient.TeamDocumentType)
	@IsOptional()
	type: prismaClient.TeamDocumentType

	@IsString()
	@IsOptional()
	name: string

	@IsString()
	@IsOptional()
	description: string

	@IsString()
	@IsOptional()
	link: string
}

@NextAuthGuard('user')
@ApiProjectTeamGuard()
class ApiTeamDocumentHandler {
	constructor() {}

	@Get()
	public async list(@Query(ValidationPipe) { teamId }: GetListTeamDocumentParams) {
		const documents = await prisma.teamDocument.findMany({
			where: { teamId },
			orderBy: { updatedAt: 'desc' },
		})

		return documents
	}

	@Get('/:documentId')
	public async get(@Param('documentId') documentId: string, @Query(ValidationPipe) { teamId }: GetTeamDocumentParams) {
		const document = await prisma.teamDocument.findUnique({
			where: { teamId, id: documentId },
		})

		return document
	}

	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) { teamId, type, name, description, link }: CreateTeamDocumentParams
	) {
		const document = await prisma.teamDocument.create({
			data: {
				type,
				name,
				description,
				link,
				team: { connect: { id: teamId } },
				createdByUser: { connect: { id: req.user?.id } },
			},
		})

		return document
	}

	@Put('/:documentId')
	public async update(
		@Param('documentId') documentId: string,
		@Body(ValidationPipe) { type, name, description, link }: UpdateTeamDocumentParams
	) {
		const updatedDocument = await prisma.teamDocument.update({
			where: { id: documentId },
			data: { type, name, description, link },
		})

		return updatedDocument
	}

	@Delete('/:documentId')
	public async delete(
		@Param('documentId') documentId: string,
		@Query(ValidationPipe) { teamId }: DeleteTeamDocumentParams
	) {
		await prisma.teamDocument.delete({
			where: { id: documentId, teamId },
		})

		return { success: true }
	}
}

export default createHandler(ApiTeamDocumentHandler)
