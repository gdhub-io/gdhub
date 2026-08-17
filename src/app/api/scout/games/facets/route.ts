import { json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { getScoutFacets } from "@/repositories/scout.games";

/**
 * The filter options, on their own. Both the games table and the Investment
 * Focus form need them and neither needs a project to get them.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "scout.games.view" }),
)(async () => json(await getScoutFacets()));
