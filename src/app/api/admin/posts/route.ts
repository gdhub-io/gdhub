import { json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.posts.view" }),
)(async () => {
	const posts = await prisma.blogPost.findMany({
		include: { authors: { select: { id: true, name: true, image: true } } },
	});

	return json(posts);
});
