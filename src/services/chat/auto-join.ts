import { env } from "@/helpers/env";
import { getMatrixUserToken } from "@/services/matrix/session";

/**
 * Accepts an invite on the user's behalf, for rooms they asked to be in by
 * joining something else (a team, a checkpoint). Best-effort: on failure the
 * invite still stands and the user can accept it by hand.
 *
 * Plain HTTP, no matrix-js-sdk: the chat session route imports it.
 */
export async function autoJoinRoom(
	roomId: string,
	userId: string,
): Promise<boolean> {
	const baseUrl = env("MATRIX_CHAT_BASE_URL");
	try {
		// Backend device, separate from the invitee's browser session.
		const invitee = await getMatrixUserToken(userId, "svc_autojoin");
		const resp = await fetch(
			`${baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/join`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${invitee.accessToken}`,
				},
				body: "{}",
			},
		);
		if (!resp.ok) {
			throw new Error(`${resp.status} ${await resp.text()}`);
		}
		await markRoomRead(baseUrl, roomId, invitee.accessToken).catch((error) =>
			console.error(`[chat] read receipt failed for ${userId}`, error),
		);
		return true;
	} catch (error) {
		console.error(`[chat] auto-join failed for ${userId}`, error);
		return false;
	}
}

// A backend join leaves the invite unread: ten minutes later Synapse emails
// "you've been invited" to a member, and that email swallows the room's
// first messages. Reading up to the join event closes it out.
async function markRoomRead(
	baseUrl: string,
	roomId: string,
	accessToken: string,
): Promise<void> {
	const room = `${baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}`;
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${accessToken}`,
	};
	const latest = await fetch(`${room}/messages?dir=b&limit=1`, { headers });
	if (!latest.ok) throw new Error(`${latest.status} ${await latest.text()}`);
	const { chunk } = (await latest.json()) as { chunk?: { event_id: string }[] };
	const eventId = chunk?.[0]?.event_id;
	if (!eventId) return;
	const resp = await fetch(
		`${room}/receipt/m.read/${encodeURIComponent(eventId)}`,
		{ method: "POST", headers, body: "{}" },
	);
	if (!resp.ok) throw new Error(`${resp.status} ${await resp.text()}`);
}
