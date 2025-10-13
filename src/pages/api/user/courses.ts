import { createHandler, Get, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user")
export class ApiMyCoursesHandler {
	@Get()
	public async get(@Req() req: NextApiRequestWithUser) {
		console.log("req.user", req.user);
		if (!req?.user) {
			return [];
		}

		const authorCourses = await prisma.course.findMany({
			where: {
				createdById: req.user.id as string,
			},
		});

		const studentCourses = await prisma.course.findMany({
			where: {
				groups: {
					some: { students: { some: { userId: req.user.id as string } } },
				},
			},
		});

		const instructorCourses = await prisma.course.findMany({
			where: {
				groups: {
					some: {
						schedule: {
							some: { lesson: { teacherId: req.user.id as string } },
						},
					},
				},
			},
		});

		return {
			author: authorCourses,
			student: studentCourses,
			instructor: instructorCourses,
		};
	}
}

export default createHandler(ApiMyCoursesHandler);
