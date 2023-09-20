import { prisma } from '@/services/prisma'
import { Get, createHandler } from 'next-api-decorators'

class ApiDictGameSettingsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameSetting.findMany()
	}
}

export default createHandler(ApiDictGameSettingsHandler)
