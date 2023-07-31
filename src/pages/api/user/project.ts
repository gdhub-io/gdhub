import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { ProjectStatus, UserRole } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Body, Delete, Get, Post, Put, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class CreateProjectDto {
	@IsString()
	name: string

	@IsString()
	seasonId: string

	@IsString({ each: true })
	coreMechanics: string[]

	@IsString()
	@IsOptional()
	description?: string

	@IsString()
	@IsOptional()
	coverImage?: string

	@IsString()
	genre: string

	@IsString()
	setting: string

	@IsString()
	platform: string

	@IsString()
	visualStyle: string

	@IsString()
	audition: string

	@IsString()
	@IsOptional()
	videoLink?: string

	@IsString()
	@IsOptional()
	pitchdeckLink?: string

	@IsString()
	@IsOptional()
	gddLink?: string

	@IsString()
	conceptLink: string
}

class UpdateProjectDto {
	@IsString()
	@IsOptional()
	name?: string

	@IsString({ each: true })
	@IsOptional()
	coreMechanics?: string[]

	@IsString()
	@IsOptional()
	description?: string

	@IsString()
	@IsOptional()
	coverImage?: string

	@IsString()
	@IsOptional()
	genre?: string

	@IsString()
	@IsOptional()
	setting?: string

	@IsString()
	@IsOptional()
	platform?: string

	@IsString()
	@IsOptional()
	visualStyle?: string

	@IsString()
	@IsOptional()
	audition?: string

	@IsString()
	@IsOptional()
	videoLink?: string

	@IsString()
	@IsOptional()
	pitchdeckLink?: string

	@IsString()
	@IsOptional()
	gddLink?: string

	@IsString()
	@IsOptional()
	conceptLink?: string

	@IsString()
	@IsOptional()
	authorId?: string

	@IsEnum(ProjectStatus)
	@IsOptional()
	status?: ProjectStatus

	@IsString()
	@IsOptional()
	stageId?: string
}

class GetProjectDto {
	@IsString()
	projectId: string
}

class QueryIdParam {
	@IsString()
	id: string
}

@NextAuthGuard('user')
class ApiProjectHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { projectId }: GetProjectDto) {
		const project = await prisma.project.findFirst({
			where: { id: projectId, authorId: req.user.id },
			include: { stage: true },
		})

		return project
	}

	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) { seasonId, ...data }: CreateProjectDto
	) {
		const season = await prisma.season.findFirst({
			where: { id: seasonId },
			include: { stages: { where: { isCurrent: { equals: true } } } },
		})

		const project = await prisma.project.create({
			data: {
				...data,
				author: { connect: { id: req.user.id } },
				status: ProjectStatus.Registered,
				stage: { connect: { id: season?.stages[0].id } },
			},
			include: {
				author: { select: { name: true, image: true, id: true, roles: true, profile: { select: { id: true } } } },
			},
		})

		if (!project.author.roles.includes(UserRole.Author)) {
			await prisma.user.update({
				where: { id: req.user.id },
				data: {
					roles: [...project.author.roles, UserRole.Author],
				},
			})
		}

		return project
	}

	@Put()
	public async update(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { id }: QueryIdParam,
		@Body(ValidationPipe) { stageId, authorId, ...data }: UpdateProjectDto
	) {
		const project = await prisma.project.update({
			where: { id },
			data: {
				...data,
				author: authorId ? { connect: { id: authorId } } : undefined,
				stage: stageId ? { connect: { id: stageId } } : undefined,
			},
			include: {
				author: { select: { name: true, image: true, id: true, roles: true, profile: { select: { id: true } } } },
			},
		})

		if (!project.author.roles.includes(UserRole.Author)) {
			await prisma.user.update({
				where: { id: req.user.id },
				data: {
					roles: [...project.author.roles, UserRole.Author],
				},
			})
		}

		return project
	}

	@Delete()
	public async delete(@Req() req: NextApiRequestWithUser, @Query(ValidationPipe) { id }: QueryIdParam) {
		await prisma.project.delete({ where: { id, authorId: req.user.id } })
	}
}

export default createHandler(ApiProjectHandler)
