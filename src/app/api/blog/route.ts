import { BlogPostStatus } from "@gdhub-io/gdhub-prisma";
import { json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = async () => {
	const posts = await prisma.blogPost.findMany({
		include: { authors: { select: { name: true, image: true } } },
		where: {
			status: BlogPostStatus.Published,
		},
		orderBy: {
			publishedAt: "desc",
		},
	});

	const postsWithDescription = posts.map(
		(post: { content: any; description?: string }) => {
			const firstParagraph = (post.content as any)?.blocks?.find(
				(block: any) => block.type === "paragraph",
			);
			const description = firstParagraph?.data?.text?.slice(0, 100) || "";
			const hasMore = firstParagraph?.data?.text?.length > 100;

			return { ...post, description: description + (hasMore ? "..." : "") };
		},
	);

	return json(postsWithDescription);
};
