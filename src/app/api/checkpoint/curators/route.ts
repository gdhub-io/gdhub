import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { listCheckpointCurators } from "@/repositories/checkpoints/curator-catalog";

const QuerySchema = z.object({ stage: z.string().max(200).optional() });

/**
 * The curators a checkpoint can be given to: specialists at an expert level who
 * have said they take mentees, minus whoever is asking. Platform-wide rather
 * than project-scoped — the list is otherwise the same whoever is buying — so it
 * needs a session and nothing else.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withValidation(QuerySchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	const viewer = user as SessionUser | undefined;
	if (!viewer) return apiError.unauthorized();

	const { stage } = body as z.infer<typeof QuerySchema>;
	return json(await listCheckpointCurators(viewer.id, stage || undefined));
});
