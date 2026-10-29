import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { searchCheckpointProjects } from "@/repositories/checkpoints/refund";

const QuerySchema = z.object({ q: z.string().trim().max(100).default("") });

/** Suggestions for the admin list's project search. */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.checkpoints.view" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { q } = body as z.infer<typeof QuerySchema>;

	return json(await searchCheckpointProjects(q));
});
