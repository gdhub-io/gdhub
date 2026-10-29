import { apiError, json, type RouteContext } from "@/lib/api-handlers";
import { findPublishedBlogPost } from "@/repositories/content/blog";

export const GET = async (
	_req: Request,
	ctx: RouteContext<{ slug: string }>,
) => {
	const { slug } = await ctx.params;

	try {
		return json(await findPublishedBlogPost(slug));
	} catch (error) {
		console.error("Error in getBySlug:", error);
		return apiError.internal("Failed to fetch blog post");
	}
};
