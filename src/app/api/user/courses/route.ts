import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const authorCourses = await prisma.course.findMany({
		where: {
			createdById: currentUser.id,
		},
	});

	const studentCourses = await prisma.course.findMany({
		where: {
			groups: {
				some: { students: { some: { userId: currentUser.id } } },
			},
		},
	});

	const instructorCourses = await prisma.course.findMany({
		where: {
			groups: {
				some: {
					schedule: {
						some: { lesson: { teacherId: currentUser.id } },
					},
				},
			},
		},
	});

	return json({
		author: authorCourses,
		student: studentCourses,
		instructor: instructorCourses,
	});
});
