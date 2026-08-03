import { CourseStudentStatus } from "@gdhub-io/gdhub-prisma";
import { SpaceRole } from "@/config/permissions/roles";
import type { SpaceAdapter } from "@/services/access/types";
import { prisma } from "@/services/prisma";

/**
 * Course space adapter.
 *
 * The author owns the space; a student who is enrolled or has finished is a
 * `member`. Blocked and expelled students are out.
 */
export const courseSpaceAdapter: SpaceAdapter = {
	resolve: async (param, user) => {
		const course = await prisma.course.findFirst({
			where: { OR: [{ slug: param }, { id: param }] },
			select: {
				id: true,
				createdById: true,
				groups: {
					select: {
						students: {
							where: {
								userId: user.id,
								status: {
									in: [
										CourseStudentStatus.Enrolled,
										CourseStudentStatus.Finished,
									],
								},
							},
							select: { userId: true },
						},
					},
				},
			},
		});

		if (!course) return null;

		if (course.createdById === user.id) {
			return { spaceId: course.id, role: SpaceRole.Owner };
		}

		const enrolled = course.groups.some((group) => group.students.length > 0);

		return { spaceId: course.id, role: enrolled ? SpaceRole.Member : null };
	},
};
