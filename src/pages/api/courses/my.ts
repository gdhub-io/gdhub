import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { createHandler, Get } from 'next-api-decorators'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'

export class ApiMyCoursesHandler {
	@Get()
	public async get() {
		const session = await getServerSession(authOptions)

		if (!session?.user?.id) {
			return []
		}

		// For now, return all published courses as a placeholder
		// TODO: Implement proper user-course relationships when schema is available
		const myCourses = await prisma.course.findMany({
			where: {
				status: prismaClient.CourseStatus.Published,
			},
		})

		return myCourses
	}
}

export default createHandler(ApiMyCoursesHandler)
