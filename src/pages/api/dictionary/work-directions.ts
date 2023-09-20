import { prisma } from '@/services/prisma'
import { Get, createHandler } from 'next-api-decorators'

class ApiDictWorkDirectionsHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.workDirection.findMany()
	}
}

export default createHandler(ApiDictWorkDirectionsHandler)
