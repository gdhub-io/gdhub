import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { ProjectStatus, UserRole } from '@prisma/client'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { Body, Get, Post, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

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

@NextAuthGuard('user')
class ApiProjectHandler {
	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) { seasonId, ...data }: CreateProjectDto
	) {
		if (!req.user.id) throw Error('Unknown user')

		const project = await prisma.project.create({
			data: {
				...data,
				author: { connect: { id: req.user.id } },
				status: ProjectStatus.Registered,
				stage: { connect: { id: seasonId } },
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
}

export default createHandler(ApiProjectHandler)
