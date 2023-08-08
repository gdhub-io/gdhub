import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { ProjectStatus, UserRole } from '@prisma/client'
import { IsEnum, IsString } from 'class-validator'
import { Body, Put, ValidationPipe, createHandler } from 'next-api-decorators'

class ApiProjectMoveDto {
	@IsString()
	projectId: string

	@IsEnum(ProjectStatus)
	newStatus: ProjectStatus
}

@NextAuthGuard('user', [UserRole.Admin])
class ApiProjectMoveHandler {
	@Put()
	public async changeStatus(@Body(ValidationPipe) { projectId, newStatus }: ApiProjectMoveDto) {
		await prisma.project.update({
			where: { id: projectId },
			data: { status: newStatus },
		})
	}
}

export default createHandler(ApiProjectMoveHandler)
