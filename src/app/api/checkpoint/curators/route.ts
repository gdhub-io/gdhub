import { json, withAuth } from "@/lib/api-handlers";
import { listCheckpointCurators } from "@/repositories/checkpoint-curators";

/**
 * The curators a checkpoint can be given to: specialists at an expert level who
 * have said they take mentees, minus whoever is asking. Platform-wide rather
 * than project-scoped — the list is otherwise the same whoever is buying — so it
 * needs a session and nothing else.
 */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) =>
	json(await listCheckpointCurators(user.id)),
);
