import { Get, createHandler } from 'next-api-decorators'
import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'

@NextAuthGuard('user')
class ApiDictWorkDirectionsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.workDirection.findMany()
	}
}

export default createHandler(ApiDictWorkDirectionsHandler)
