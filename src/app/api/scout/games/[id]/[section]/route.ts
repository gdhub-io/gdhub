import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	getProjectCardActivities,
	getProjectCardFiles,
	getProjectCardInvestment,
	getProjectCardReviews,
	getProjectCardTeam,
	getProjectCardWorkflow,
	visibleProjectId,
} from "@/repositories/scout/project-card";

/**
 * One section of a project card.
 *
 * A section per request rather than one payload: the card opens on Overview,
 * and a scout who never touches the Team tab should never pay for the equity
 * join. Overview asks the same sections for a handful of rows via `limit`, so
 * its digests are the tabs' own data rather than a second shape to maintain.
 */
const SECTIONS = {
	team: getProjectCardTeam,
	files: getProjectCardFiles,
	activities: getProjectCardActivities,
	workflow: getProjectCardWorkflow,
	reviews: getProjectCardReviews,
	investment: getProjectCardInvestment,
} satisfies Record<string, (id: string, limit?: number) => Promise<unknown>>;

const QuerySchema = z.object({
	limit: z.coerce.number().int().positive().max(50).optional(),
});

const isSection = (value: string): value is keyof typeof SECTIONS =>
	value in SECTIONS;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "scout.games.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, ctx, { body }) => {
	const { id, section } = (await ctx.params) as { id: string; section: string };
	const { limit } = body as z.infer<typeof QuerySchema>;

	if (!isSection(section)) return apiError.notFound("Unknown section");

	// The visibility check and the read are independent, so they go together:
	// the guard is checked once here and the loaders stay plain reads. A read of
	// a project the scout may not see is discarded, never returned.
	const [visible, data] = await Promise.all([
		visibleProjectId(id),
		SECTIONS[section](id, limit),
	]);

	if (!visible) return apiError.notFound("Project not found");

	return json(data);
});
