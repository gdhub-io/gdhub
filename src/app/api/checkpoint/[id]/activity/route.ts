import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { activityAccessOf, viewerOf } from "@/repositories/checkpoints/viewer";
import { getProjectActivity } from "@/repositories/project/activity";

const QuerySchema = z.object({
	before: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * The project's activity as its checkpoint's curator reads it: they have no
 * seat in the project, so the checkpoint lets them in, whenever they open it.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withValidation(QuerySchema, "query"),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };
	const { before, limit } = body as z.infer<typeof QuerySchema>;

	const checkpoint = await activityAccessOf(id, currentUser.id);
	if (!checkpoint) return apiError.notFound();
	if (!viewerOf(checkpoint, currentUser.id)) return apiError.forbidden();

	return json(
		await getProjectActivity(checkpoint.projectId, {
			before: before ? new Date(before) : new Date(),
			limit,
		}),
	);
});
