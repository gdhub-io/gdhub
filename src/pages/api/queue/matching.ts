import { NextAuthGuard } from '@/lib/api-middlewares'
import { openAI } from '@/services/openai'
import { prisma } from '@/services/prisma'
import { Body, Post, createHandler } from 'next-api-decorators'

NextAuthGuard('api')
class ApiQueueTelegramHandler {
	constructor() {}

	@Post()
	public async workerProcessor(@Body() job: { name: string; data: any }) {
		const { specialityId, projectId, specialistText, projectText } = job.data

		const response = await openAI.matchingSpecAndProj(specialistText, projectText)

		await prisma.matchingSpecialistAndProject.upsert({
			where: { projectAndSpecialist: { specialityId, projectId } },
			create: {
				specialityId,
				projectId,
				authorScore: response.authorScore,
				projectScore: response.projectScore,
				teamScore: response.teamScore,
				summary: response.summary,
				avgScore: Math.round((response.authorScore + response.projectScore + response.teamScore) / 3),
			},
			update: {
				authorScore: response.authorScore,
				projectScore: response.projectScore,
				teamScore: response.teamScore,
				summary: response.summary,
				avgScore: Math.round((response.authorScore + response.projectScore + response.teamScore) / 3),
			},
		})

		return { success: true }
	}
}

export default createHandler(ApiQueueTelegramHandler)
