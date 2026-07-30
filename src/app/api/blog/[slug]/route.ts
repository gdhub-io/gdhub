import { BlogPostStatus } from "@gdhub-io/gdhub-prisma";
import { apiError, json, type RouteContext } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = async (
	_req: Request,
	ctx: RouteContext<{ slug: string }>,
) => {
	const { slug } = await ctx.params;

	try {
		console.log("Looking for blog post with slug:", slug);

		const post = await prisma.blogPost.findUnique({
			where: {
				slug,
				status: BlogPostStatus.Published,
			},
			include: { authors: { select: { name: true, image: true } } },
		});

		console.log("Found post:", post ? "yes" : "no");

		if (!post) {
			return json(null);
		}

		const firstParagraph = (post.content as any)?.blocks?.find(
			(block: any) => block.type === "paragraph",
		);
		const description = firstParagraph?.data?.text?.slice(0, 100) || "";
		const hasMore = firstParagraph?.data?.text?.length > 100;

		return json({
			...post,
			description: description + (hasMore ? "..." : ""),
		});
	} catch (error) {
		console.error("Error in getBySlug:", error);
		return apiError.internal("Failed to fetch blog post");
	}
};
