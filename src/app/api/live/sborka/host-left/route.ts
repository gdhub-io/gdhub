import { apiError, json, withAuth } from "@/lib/api-handlers";
import { closeSborkaIfHostGone } from "@/services/live/sborka";

/** A guest saw the host leave; the room closes only if no host is left in it. */
export const POST = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	if (!user) return apiError.unauthorized();
	return json({ closed: await closeSborkaIfHostGone() });
});
