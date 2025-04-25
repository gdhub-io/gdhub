import { NextAuthGuard } from '@/lib/api-middlewares'
import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { BadRequestException, Get, createHandler } from 'next-api-decorators'

@NextAuthGuard('user')
class ApiProjectsHandler {
	constructor() {}

	@Get()
	public async list() {
		try {
			return await prisma.project.getProjectsOrderedByActivity({ order: 'desc' })
		} catch (error) {
			console.error('[projects: list: error]', error)
			throw new BadRequestException('Failed to get projects')
		}
	}
}

export default createHandler(ApiProjectsHandler)
