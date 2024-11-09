import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Type } from 'class-transformer'
import { IsString, IsOptional, IsBoolean } from 'class-validator'
import { Body, Post, Put, Req, ValidationPipe, createHandler } from 'next-api-decorators'

class AddTelegramConnectionDto {
	@IsString()
	id: string
}

class AddConnectionDto {
	@Type(() => AddTelegramConnectionDto)
	@IsOptional()
	telegram?: AddTelegramConnectionDto
}

class AddDisconnectionDto {
	@IsBoolean()
	@IsOptional()
	telegram?: boolean
}

@NextAuthGuard('user')
class ApiUserConnectionHandler {
	constructor() {}

	@Post()
	public async connect(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: AddConnectionDto) {
		if (data?.telegram?.id) {
			await prisma.user.update({
				where: { id: req.user.id },
				data: { telegramId: data.telegram.id },
			})
		}
	}

	@Put()
	public async disconnect(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: AddDisconnectionDto) {
		if (data?.telegram === true) {
			await prisma.user.update({
				where: { id: req.user.id },
				data: { telegramId: null },
			})
		}
	}
}

export default createHandler(ApiUserConnectionHandler)
