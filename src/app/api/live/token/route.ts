import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { can } from "@/services/access";

const LiveTokenQuerySchema = z.object({
	roomName: z.string(),
});

type LiveTokenQuery = z.infer<typeof LiveTokenQuerySchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "hub.live_room.use" }),
	withValidation(LiveTokenQuerySchema, "query"),
)(async (_req, _ctx, { user, body, access }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser || !access) return apiError.unauthorized();
	const { roomName } = body as LiveTokenQuery;

	// Owner powers on the Daily call, not access to it: the guard above already
	// decided who may ask for a token at all.
	const isOwner = can(access, "hub.live_room.manage");

	const response = await fetch("https://api.daily.co/v1/meeting-tokens", {
		method: "post",
		body: JSON.stringify({
			properties: {
				room_name: isOwner ? undefined : roomName,
				is_owner: isOwner,
				user_name: currentUser.name,
				enable_screenshare: true,
				lang: "user",
				permissions: {
					hasPresence: true,
					canSend: true,
					canAdmin: isOwner,
				},
			},
		}),
		headers: {
			Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
		},
	});

	const data = await response.json();

	return json({ token: data.token });
});
