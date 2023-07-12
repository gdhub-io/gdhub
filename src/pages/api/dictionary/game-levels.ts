import { Get, createHandler } from 'next-api-decorators'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'

@NextAuthGuard('user')
class ApiDictGameLevelsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameDifficultyLevel.findMany()
	}
}

export default createHandler(ApiDictGameLevelsHandler)
