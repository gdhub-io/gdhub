import { NextAuthGuard } from '@/lib/api-middlewares'
import { langGraphService } from '@/services/langgraph'
import { prisma } from '@/services/prisma'
import { IsOptional, IsString } from 'class-validator'
import { Body, Get, Post, Query, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class CreateThreadDto {
	@IsOptional()
	metadata?: Record<string, unknown>
}

class ThreadQueryDto {
	@IsString()
	threadId: string
}

class SendMessageDto extends ThreadQueryDto {
	@IsString()
	text: string
	@IsOptional()
	assistantId?: string
	@IsOptional()
	route?: string
}

class AssistantsQueryDto {
	@IsOptional()
	@IsString()
	graphId?: string
}

@NextAuthGuard('user')
class ApiUserAIHandler {
	@Get('/assistants')
	public async assistants(@Query(ValidationPipe) { graphId }: AssistantsQueryDto) {
		return langGraphService.listAssistants(graphId)
	}

	@Post('/thread')
	public async createThread(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) { metadata }: CreateThreadDto) {
		const thread = await langGraphService.createThread(metadata)
		const assistantId = await langGraphService.getDefaultAssistantId()

		await prisma.aIThread.create({
			data: {
				externalThreadId: thread.thread_id,
				assistantId,
				userId: req.user.id,
				metadata: {
					...metadata,
					route: req.headers.pathname,
				},
			},
		})

		return thread
	}

	@Get('/state')
	public async getState(@Query(ValidationPipe) { threadId }: ThreadQueryDto) {
		const state = await langGraphService.getThreadState(threadId)
		const messages = langGraphService.normalizeValuesToMessages(state.values)
		return { state, messages }
	}

	@Post('/send')
	public async send(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) { threadId, text, assistantId, route }: SendMessageDto
	) {
		const values = await langGraphService.sendHumanMessageAndWait(threadId, text, assistantId, route)
		const messages = langGraphService.normalizeValuesToMessages(values)

		await prisma.aIThread.update({
			where: { userId_externalThreadId: { userId: req.user.id, externalThreadId: threadId } },
			data: {
				lastMessageAt: new Date(),
			},
		})

		return { values, messages }
	}

	@Get('/history')
	public async history(@Req() req: NextApiRequestWithUser) {
		const threads = await prisma.aIThread.findMany({
			where: { userId: req.user.id },
			orderBy: { updatedAt: 'desc' },
			select: {
				id: true,
				title: true,
				lastMessageAt: true,
			},
		})

		return threads
	}
}

export default createHandler(ApiUserAIHandler)
