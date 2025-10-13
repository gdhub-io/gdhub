import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { createHandler, Get, Param } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class ApiBlogPostHandler {
	constructor() {}

	@Get()
	public async list() {
		const posts = await prisma.blogPost.findMany({
			include: { authors: { select: { name: true, image: true } } },
			where: {
				status: prismaClient.BlogPostStatus.Published,
			},
			orderBy: {
				publishedAt: "desc",
			},
		});

		// description
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

		return postsWithDescription;
	}

	@Get("/:slug")
	public async getBySlug(@Param("slug") slug: string) {
		try {
			console.log("Looking for blog post with slug:", slug);

			const post = await prisma.blogPost.findUnique({
				where: {
					slug,
					status: prismaClient.BlogPostStatus.Published,
				},
				include: { authors: { select: { name: true, image: true } } },
			});

			console.log("Found post:", post ? "yes" : "no");

			if (!post) {
				return null;
			}

			// description
			const firstParagraph = (post.content as any)?.blocks?.find(
				(block: any) => block.type === "paragraph",
			);
			const description = firstParagraph?.data?.text?.slice(0, 100) || "";
			const hasMore = firstParagraph?.data?.text?.length > 100;

			return {
				...post,
				description: description + (hasMore ? "..." : ""),
			};
		} catch (error) {
			console.error("Error in getBySlug:", error);
			throw error;
		}
	}
}

export default createHandler(ApiBlogPostHandler);
