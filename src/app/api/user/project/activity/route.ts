import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { getProjectActivity } from "@/repositories/project-activity.repository";

const ActivityQuerySchema = z.object({
	projectId: z.string().min(1),
	/** The cursor: the `at` of the last event already shown. */
	before: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** The project's activity, a page at a time, for whoever may see the project. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.info.view",
		idFrom: "query.projectId",
	}),
	withValidation(ActivityQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { projectId, before, limit } = body as z.infer<
		typeof ActivityQuerySchema
	>;

	return json(
		await getProjectActivity(projectId, {
			before: before ? new Date(before) : new Date(),
			limit,
		}),
	);
});
