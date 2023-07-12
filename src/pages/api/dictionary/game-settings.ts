import { Get, createHandler } from 'next-api-decorators'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'

@NextAuthGuard('user')
class ApiDictGameSettingsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameSetting.findMany()
	}
}

export default createHandler(ApiDictGameSettingsHandler)
