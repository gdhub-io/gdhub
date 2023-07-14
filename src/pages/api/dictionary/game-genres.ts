import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import { Get, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiDictGameGenresHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameGenre.findMany()
	}
}

export default createHandler(ApiDictGameGenresHandler)
