import { prisma } from '@/services/prisma'
import prismaClient from '@gdhub-io/gdhub-prisma/dist/client'
import { IsString } from 'class-validator'
import { createHandler, Get } from 'next-api-decorators'
import { Query } from 'next-api-decorators'

class ParamSlugDto {
	@IsString()
	slug: string
}

export class ApiCourseHandler {
	@Get()
	public async get(@Query() { slug }: ParamSlugDto) {
		const course = await prisma.course.findFirst({
			where: {
				slug,
				status: prismaClient.CourseStatus.Published,
			},
		})

		if (!course) {
			throw new Error('Course not found')
		}

		return course
	}
}

export default createHandler(ApiCourseHandler)
