import { json, withAuth } from "@/lib/api-handlers";
import { listCheckpointCurators } from "@/repositories/checkpoint-curators";

/**
 * The curators a checkpoint can be given to: specialists at an expert level who
 * have said they take mentees. Platform-wide rather than project-scoped — the
 * list is the same whoever is buying — so it needs a session and nothing else.
 */
export const GET = withAuth({ mode: "user" })(async () =>
	json(await listCheckpointCurators()),
);
