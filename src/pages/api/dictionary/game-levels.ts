import { prisma } from '@/services/prisma'
import { Get, createHandler } from 'next-api-decorators'

class ApiDictGameLevelsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameDifficultyLevel.findMany()
	}
}

export default createHandler(ApiDictGameLevelsHandler)
