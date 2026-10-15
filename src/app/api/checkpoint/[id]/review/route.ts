import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { getReview } from "@/repositories/checkpoint-review";

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const caller = user as SessionUser | undefined;
	if (!caller) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const review = await getReview(id, caller.id);
	return review ? json(review) : apiError.notFound();
});
