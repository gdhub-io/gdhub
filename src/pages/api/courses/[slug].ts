import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsString } from "class-validator";
import { createHandler, Get, Query } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class ParamSlugDto {
	@IsString()
	slug: string;
}

export class ApiCourseHandler {
	@Get()
	public async get(@Query() { slug }: ParamSlugDto) {
		const course = await prisma.course.findFirst({
			where: {
				slug,
				status: prismaClient.CourseStatus.Published,
			},
			include: {
				direction: { select: { id: true, name: true } },
				createdByUser: {
					select: { id: true, name: true, image: true },
				},
				curriculums: {
					select: {
						id: true,
						name: true,
						description: true,
						price: true,
						lessons: {
							select: {
								id: true,
								name: true,
								description: true,
								order: true,
								ectsInClass: true,
								ectsHomework: true,
								teacher: {
									select: { id: true, name: true, image: true },
								},
							},
							orderBy: { order: "asc" },
						},
					},
				},
				groups: {
					where: { status: prismaClient.CourseGroupStatus.Recruitment },
					select: {
						id: true,
						name: true,
						curriculum: { select: { id: true, price: true } },
						schedule: {
							select: { date: true },
							orderBy: { date: "asc" },
						},
					},
				},
			},
		});

		if (!course) {
			throw new Error("Course not found");
		}

		return course;
	}
}

export default createHandler(ApiCourseHandler);
