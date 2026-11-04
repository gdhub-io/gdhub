import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { advisorCalendar } from "@/repositories/advisor/availability";

/** Every checkpoint call booked with the asker, upcoming and past. */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const advisor = user as SessionUser | undefined;
	if (!advisor) return apiError.unauthorized();

	return json(await advisorCalendar(advisor.id));
});
