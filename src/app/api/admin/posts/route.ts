import { UserRole } from "@gdhub-io/gdhub-prisma";
import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({
	mode: "user",
	roles: [UserRole.Admin],
})(async () => {
	const posts = await prisma.blogPost.findMany({
		include: { authors: { select: { id: true, name: true, image: true } } },
	});

	return json(posts);
});
