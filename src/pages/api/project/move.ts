import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { UserRole } from '@prisma/client'
import { IsString } from 'class-validator'
import { Body, Put, ValidationPipe, createHandler } from 'next-api-decorators'

class ApiProjectMoveDto {
	@IsString()
	projectId: string
	@IsString()
	targetStageId: string
}

@NextAuthGuard('user', [UserRole.Author])
class ApiProjectMoveHandler {
	@Put()
	public async move(@Body(ValidationPipe) { projectId, targetStageId }: ApiProjectMoveDto) {
		let targetStage

		if (['next', 'previous'].includes(targetStageId)) {
			const project = await prisma.project.findFirst({ where: { id: projectId }, select: { stage: true } })

			if (project) {
				if (targetStageId == 'next') {
					targetStage = await prisma.seasonStage.findFirst({
						where: { seasonId: project.stage.seasonId, order: project.stage.order + 1 },
					})
				}

				if (targetStageId == 'previous') {
					targetStage = await prisma.seasonStage.findFirst({
						where: { seasonId: project.stage.seasonId, order: project.stage.order - 1 },
					})
				}
			}
		}

		await prisma.project.update({
			where: { id: projectId },
			data: { stageId: targetStage?.id || targetStageId },
		})
	}
}

export default createHandler(ApiProjectMoveHandler)
