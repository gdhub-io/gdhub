import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
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
