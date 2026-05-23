import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const courses = await prisma.course.findMany({
		where: {
			status: prismaClient.CourseStatus.Published,
			groups: {
				some: { status: prismaClient.CourseGroupStatus.Recruitment },
			},
		},
		include: {
			direction: { select: { name: true } },
			curriculums: { select: { price: true } },
			groups: {
				where: { status: prismaClient.CourseGroupStatus.Recruitment },
				select: {
					curriculum: { select: { price: true } },
					schedule: { select: { date: true }, orderBy: { date: "asc" } },
				},
			},
		},
	});
	return json(courses);
}
