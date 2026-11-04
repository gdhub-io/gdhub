import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { confirmAvailability } from "@/repositories/advisor/availability";

/** "Still correct": the advisor's hours hold as they are. */
export const POST = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const advisor = user as SessionUser | undefined;
	if (!advisor) return apiError.unauthorized();

	await confirmAvailability(advisor.id);

	return json({ ok: true });
});
