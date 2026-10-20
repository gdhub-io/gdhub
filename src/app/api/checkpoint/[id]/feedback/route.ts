import { z } from "zod";
import { RATING_COMMENT_MAX } from "@/config/checkpoint";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	feedbackFor,
	rateCheckpoint,
} from "@/repositories/checkpoint-feedback";

/**
 * The rating block of the results modal. Scoped by the session: only the
 * checkpoint's rater gets anything back, everyone else a plain null.
 */
export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const viewer = user as SessionUser | undefined;
	if (!viewer) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	return json(await feedbackFor(id, viewer.id));
});

const RatingSchema = z.object({
	rating: z.number().int().min(1).max(5),
	comment: z.string().max(RATING_COMMENT_MAX).optional(),
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withValidation(RatingSchema),
)(async (_req, ctx, { user, body }) => {
	const viewer = user as SessionUser | undefined;
	if (!viewer) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const result = await rateCheckpoint(
		id,
		viewer.id,
		body as z.infer<typeof RatingSchema>,
	);

	if (result.ok) return json(result.feedback);
	if (result.error === "notFound") return apiError.notFound();
	if (result.error === "notRater") return apiError.forbidden();
	if (result.error === "alreadyRated") {
		return apiError.conflict(result.error, { feedback: result.feedback });
	}
	return apiError.badRequest(result.error);
});
