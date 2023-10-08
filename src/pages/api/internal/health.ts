import { prisma } from '@/services/prisma'
import { Get, createHandler } from 'next-api-decorators'

class ApiTemplateEndpointHandler {
	@Get()
	public async get() {
		return await prisma.$isHealthy()
	}
}

export default createHandler(ApiTemplateEndpointHandler)
