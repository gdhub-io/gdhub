import {
	type ChatRoomKind,
	ChatRoomStatus,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import * as sdk from "matrix-js-sdk";
import {
	EventType,
	GuestAccess,
	HistoryVisibility,
	MsgType,
	Preset,
	Visibility,
} from "matrix-js-sdk";
import { env } from "@/helpers/env";
import { isAllowedRemoteImage } from "@/helpers/remote-image";
import { ensureMatrixUser } from "@/services/matrix/admin";
import { getMatrixUserToken } from "@/services/matrix/session";
import { prisma } from "@/services/prisma";

export type EnsureChatRoomArgs = {
	kind: ChatRoomKind;
	/** Deterministic unique key for dedup, e.g. `vacancy:{vacancyId}:{candidateId}`. */
	directKey: string;
	title?: string;
	topic?: string;
	isDirect?: boolean;
	/** Denormalized refs for context providers, stored as JSON. */
	context?: Record<string, unknown>;
	/** Whose Matrix session creates the room. */
	initiatorUserId: string;
	/** Users invited to the room (everyone except the initiator). */
	inviteeUserIds: string[];
	/** Best-effort room avatar (e.g. project cover URL). */
	avatarUrl?: string;
	/** Best-effort opening message from the initiator. */
	firstMessage?: string;
	/**
	 * Join invitees with their own Matrix sessions right after room creation,
	 * skipping the accept-invite screen. Use when the invitee already asked for
	 * the conversation (advice requester, vacancy applicant). Best-effort.
	 */
	autoJoinInvitees?: boolean;
};

export type EnsureChatRoomResult = {
	chatRoomId: string;
	roomId: string;
	created: boolean;
};

/**
 * Idempotently provision a Matrix room and its ChatRoom registry row. One row per
 * `directKey`; a second call returns the existing room. The initiator's Matrix
 * session creates the room and invites the others. Avatar and first-message are
 * best-effort and never block room creation.
 */
export async function ensureChatRoom(
	args: EnsureChatRoomArgs,
): Promise<EnsureChatRoomResult> {
	const {
		kind,
		directKey,
		title,
		topic,
		isDirect = true,
		context,
		initiatorUserId,
		inviteeUserIds,
		avatarUrl,
		firstMessage,
		autoJoinInvitees,
	} = args;

	// Registry row first so we have a stable id for the room alias.
	const row = await prisma.chatRoom.upsert({
		where: { directKey },
		create: {
			kind,
			directKey,
			title,
			isDirect,
			context: (context ?? undefined) as Prisma.InputJsonValue,
		},
		update: {},
		select: { id: true, matrixRoomId: true },
	});

	if (row.matrixRoomId) {
		return { chatRoomId: row.id, roomId: row.matrixRoomId, created: false };
	}

	const userIds = [initiatorUserId, ...inviteeUserIds];
	const users = await prisma.user.findMany({
		where: { id: { in: userIds } },
		select: { id: true, email: true, name: true, image: true },
	});
	const byId = new Map(users.map((u) => [u.id, u]));

	const matrixUsers = await Promise.all(
		userIds.map(async (id) => {
			const u = byId.get(id);
			if (!u) throw new Error(`Chat participant ${id} not found`);
			const m = await ensureMatrixUser(
				u.id,
				u.email ?? undefined,
				u.name ?? undefined,
				u.image ?? undefined,
			);
			return { userId: id, matrixUserId: m.user_id };
		}),
	);

	const initiatorMatrixId = matrixUsers.find(
		(m) => m.userId === initiatorUserId,
	)?.matrixUserId;
	if (!initiatorMatrixId) throw new Error("Chat initiator not found");
	const inviteeMatrixIds = matrixUsers
		.filter((m) => m.userId !== initiatorUserId)
		.map((m) => m.matrixUserId);

	// Backend device, separate from the initiator's browser session.
	const session = await getMatrixUserToken(initiatorUserId, "svc_backend");

	// Fresh client per request — never reuse the shared singleton, which would
	// leak one user's token across requests.
	const client = sdk.createClient({
		baseUrl: env("MATRIX_CHAT_BASE_URL"),
		accessToken: session.accessToken,
		userId: initiatorMatrixId,
		deviceId: session.deviceId,
	});

	let roomId: string;
	try {
		const room = await client.createRoom({
			// Local alias, not a public-directory listing: it is the recovery
			// handle for the M_ROOM_IN_USE branch below, nothing else.
			room_alias_name: `room-${row.id}`,
			name: title,
			topic: topic || undefined,
			is_direct: isDirect,
			invite: inviteeMatrixIds,
			// Never rely on the homeserver's defaults for a private conversation.
			preset: Preset.PrivateChat,
			visibility: Visibility.Private,
			initial_state: [
				{
					type: EventType.RoomHistoryVisibility,
					state_key: "",
					content: { history_visibility: HistoryVisibility.Invited },
				},
				{
					type: EventType.RoomGuestAccess,
					state_key: "",
					content: { guest_access: GuestAccess.Forbidden },
				},
			],
		});
		roomId = room.room_id;
	} catch (error) {
		// A previous attempt crashed after createRoom but before persisting
		// matrixRoomId (or a concurrent call won the race): the fixed alias is
		// taken while the row is empty. Adopt the existing room instead of
		// wedging this directKey forever.
		const errcode = (error as { errcode?: string })?.errcode;
		if (errcode !== "M_ROOM_IN_USE") throw error;
		const alias = `#room-${row.id}:${env("MATRIX_CHAT_HOMESERVER_DOMAIN")}`;
		const resolved = await client.getRoomIdForAlias(alias);
		roomId = resolved.room_id;
	}

	// Persist the link FIRST — the steps below are best-effort, and a crash
	// between room creation and this write would orphan the alias.
	await prisma.chatRoom.update({
		where: { id: row.id },
		data: {
			matrixRoomId: roomId,
			status: ChatRoomStatus.Open,
		},
	});

	if (autoJoinInvitees) {
		await Promise.all(
			inviteeUserIds.map((inviteeId) => autoJoinRoom(roomId, inviteeId)),
		);
	}

	if (avatarUrl && isAllowedRemoteImage(avatarUrl)) {
		try {
			const file = await fetch(avatarUrl).then((res) => res.blob());
			const uploaded = await client.uploadContent(file, {
				type: "image/png",
				name: `room-${row.id}-avatar.png`,
			});
			await client.sendStateEvent(roomId, EventType.RoomAvatar, {
				url: uploaded.content_uri || undefined,
			});
		} catch (error) {
			console.error("[chat] avatar upload failed", error);
		}
	}

	if (firstMessage) {
		try {
			await client.sendEvent(roomId, EventType.RoomMessage, {
				msgtype: MsgType.Text,
				body: firstMessage,
			});
		} catch (error) {
			console.error("[chat] first message failed", error);
		}
	}

	return { chatRoomId: row.id, roomId, created: true };
}

/**
 * Accepts an invite on the user's behalf, for rooms they asked to be in by
 * joining something else (a team, a checkpoint). Best-effort: on failure the
 * invite still stands and the user can accept it by hand.
 */
export async function autoJoinRoom(roomId: string, userId: string) {
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
	} catch (error) {
		console.error(`[chat] auto-join failed for ${userId}`, error);
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
