import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(async () => {
	const posts = await prisma.blogPost.findMany({
		include: { authors: { select: { id: true, name: true, image: true } } },
	});

	return json(posts);
});
