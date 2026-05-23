import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { apiError, json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

type Params = Promise<{ slug: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
	const { slug } = await params;

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
							teacher: { select: { id: true, name: true, image: true } },
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

	if (!course) return apiError.notFound("Course not found");
	return json(course);
}
