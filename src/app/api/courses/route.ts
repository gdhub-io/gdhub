import { CourseGroupStatus, CourseStatus } from "@gdhub-io/gdhub-prisma";
import { json, sharedCache } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const courses = await prisma.course.findMany({
		where: {
			status: CourseStatus.Published,
			groups: {
				some: { status: CourseGroupStatus.Recruitment },
			},
		},
		include: {
			direction: { select: { name: true } },
			curriculums: { select: { price: true } },
			groups: {
				where: { status: CourseGroupStatus.Recruitment },
				select: {
					curriculum: { select: { price: true } },
					schedule: { select: { date: true }, orderBy: { date: "asc" } },
				},
			},
		},
	});
	return json(courses, sharedCache(300));
}
