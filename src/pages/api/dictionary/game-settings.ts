import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Get, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiDictGameSettingsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameSetting.findMany()
	}
}

export default createHandler(ApiDictGameSettingsHandler)
