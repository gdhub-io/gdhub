import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { createHandler, Get } from 'next-api-decorators'

export class ApiCoursesHandler {
	@Get()
	public async get() {
		return await prisma.course.findMany({
			where: {
				status: prismaClient.CourseStatus.Published,
				groups: { some: { status: prismaClient.CourseGroupStatus.Recruitment } },
			},
			include: {
				direction: { select: { name: true } },
				curriculums: { select: { price: true } },
				groups: {
					where: { status: prismaClient.CourseGroupStatus.Recruitment },
					select: {
						curriculum: { select: { price: true } },
						schedule: { select: { date: true }, orderBy: { date: 'asc' } },
					},
				},
			},
		})
	}
}

export default createHandler(ApiCoursesHandler)
