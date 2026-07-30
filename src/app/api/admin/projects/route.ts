import { UserRole } from "@gdhub-io/gdhub-prisma";
import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({
	mode: "user",
	roles: [UserRole.Admin],
})(async () => {
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
