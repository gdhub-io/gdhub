import { json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const recentDevlogs = await prisma.projectReport.findMany({
		take: 6,
		orderBy: {
			publishedAt: "desc",
		},
		where: {
			project: {
				status: "Approved",
				coverImage: { not: null },
			},
		},
		include: {
			author: {
				select: {
					name: true,
					image: true,
				},
			},
			project: {
				select: {
					name: true,
					slug: true,
					description: true,
					coverImage: true,
				},
			},
		},
	});

	return json(recentDevlogs);
}
