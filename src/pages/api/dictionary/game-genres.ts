import { prisma } from '@/services/prisma'
import { Get, createHandler } from 'next-api-decorators'

class ApiDictGameGenresHandler {
	constructor() {}

	@Get()
	public async get() {
		return await prisma.gameGenre.findMany()
	}
}

export default createHandler(ApiDictGameGenresHandler)
