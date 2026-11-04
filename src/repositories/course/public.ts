import { CourseGroupStatus, CourseStatus } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";

/** A published course as its public page shows it, or `null`. */
export async function findPublishedCourse(slug: string) {
	return prisma.course.findFirst({
		where: {
			slug,
			status: CourseStatus.Published,
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
							teacher: { select: { id: true, name: true, image: true } },
						},
						orderBy: { order: "asc" },
					},
				},
			},
			groups: {
				where: { status: CourseGroupStatus.Recruitment },
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
}
