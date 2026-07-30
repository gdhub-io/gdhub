import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const projects = await prisma.project.findMany({
		where: {
			status: ProjectStatus.Approved,
			coverImage: { not: null },
			workflow: { currentStep: { order: { gt: 1 } } },
		},
		select: {
			id: true,
			name: true,
			slug: true,
			coverImage: true,
			genre: true,
			platform: true,
			updatedAt: true,
		},
		orderBy: { updatedAt: "desc" },
		take: 5,
	});

	return json(projects);
}
