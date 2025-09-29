import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { createHandler, Get } from 'next-api-decorators'

export class ApiCoursesHandler {
	@Get()
	public async get() {
		return await prisma.course.findMany({ where: { status: prismaClient.CourseStatus.Published } })
	}
}

export default createHandler(ApiCoursesHandler)
