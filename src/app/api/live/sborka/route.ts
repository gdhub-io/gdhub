import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import {
	canHostSborka,
	closeSborka,
	isSborkaOpen,
	openSborka,
	sborkaCanBroadcast,
	sborkaGuestProfile,
} from "@/services/live/sborka";
import type { SborkaStateDto } from "@/types/live";

/** Any signed-in user: whether the studio is open and who they are in it. */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const me = user as SessionUser | undefined;
	if (!me) return apiError.unauthorized();

	const [open, host, profile] = await Promise.all([
		isSborkaOpen(),
		canHostSborka(me),
		sborkaGuestProfile(me.id),
	]);
	return json<SborkaStateDto>({
		open,
		host,
		profile,
		canBroadcast: host && sborkaCanBroadcast(),
	});
});

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "hub.live_room.manage" }),
)(async () => {
	await openSborka();
	return json({ open: true });
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "hub.live_room.manage" }),
)(async () => {
	await closeSborka();
	return json({ open: false });
});
