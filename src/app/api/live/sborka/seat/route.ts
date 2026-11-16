import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { canHostSborka, sborkaSeat } from "@/services/live/sborka";
import type { SborkaSeatDto } from "@/types/live";

/** A meeting token for the open studio; the host's token owns the room. */
export const POST = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const me = user as SessionUser | undefined;
	if (!me) return apiError.unauthorized();

	const seat = await sborkaSeat({
		id: me.id,
		name: me.name ?? "",
		host: await canHostSborka(me),
	});
	if (!seat) return apiError.conflict("The studio is not open");
	return json<SborkaSeatDto>(seat);
});
