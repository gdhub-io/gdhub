import { json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.projects.view" }),
)(async () => {
	const projects = await prisma.project.findMany({
		select: {
			id: true,
			name: true,
			slug: true,
		},
		orderBy: {
			name: "asc",
		},
	});

	return json(projects);
});
