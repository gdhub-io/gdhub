import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Get, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiDictGameLevelsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameDifficultyLevel.findMany()
	}
}

export default createHandler(ApiDictGameLevelsHandler)
