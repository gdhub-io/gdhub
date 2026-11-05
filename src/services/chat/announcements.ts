import { readFile } from "node:fs/promises";
import path from "node:path";
import { ChatRoomKind, ChatRoomStatus } from "@gdhub-io/gdhub-prisma";
import {
	ANNOUNCEMENTS_DIRECT_KEY,
	ANNOUNCEMENTS_JOIN_RECHECK_SECONDS,
	ANNOUNCEMENTS_ROOM_NAME,
	ANNOUNCEMENTS_ROOM_TOPIC,
	GDHUB_MATRIX_DISPLAY_NAME,
	GDHUB_MATRIX_LOCALPART,
} from "@/config/chat";
import {
	type ChatMessagePayload,
	editContent,
	messageContent,
} from "@/helpers/chat-media";
import { env } from "@/helpers/env";
import type { SessionUser } from "@/lib/api-handlers";
import { getSpaceAccess, isStaff } from "@/services/access";
import { cacheGet, cacheSet } from "@/services/cache";
import { autoJoinRoom } from "@/services/chat/auto-join";
import {
	ensureMatrixUser,
	inviteUserToRoom,
	uploadMatrixAvatarBytes,
} from "@/services/matrix/admin";
import { getMatrixUserToken } from "@/services/matrix/session";
import { prisma } from "@/services/prisma";

/**
 * The Announcements channel: one room every user is in, where only the GDHub
 * account posts. Admins write in the app and the server posts as GDHub, so the
 * room's power levels never have to know who the admins are.
 *
 * Plain HTTP, no matrix-js-sdk: the chat session route imports it.
 */

const BACKEND_DEVICE = "svc_backend";

const gdhubMatrixId = () =>
	`@${GDHUB_MATRIX_LOCALPART}:${env("MATRIX_CHAT_HOMESERVER_DOMAIN")}`;

async function gdhubToken(): Promise<string> {
	const { accessToken } = await getMatrixUserToken(
		GDHUB_MATRIX_LOCALPART,
		BACKEND_DEVICE,
	);
	return accessToken;
}

async function matrixRequest<T>(
	method: "GET" | "POST" | "PUT",
	urlPath: string,
	body?: unknown,
): Promise<T> {
	const resp = await fetch(`${env("MATRIX_CHAT_BASE_URL")}${urlPath}`, {
		method,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${await gdhubToken()}`,
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!resp.ok) {
		throw new Error(
			`Matrix ${method} ${urlPath}: ${resp.status} ${await resp.text()}`,
		);
	}
	return (await resp.json()) as T;
}

/** The account posts come from, with its name and the brand mark. Idempotent. */
export async function ensureGdhubAccount(): Promise<string> {
	await ensureMatrixUser(
		GDHUB_MATRIX_LOCALPART,
		undefined,
		GDHUB_MATRIX_DISPLAY_NAME,
	);

	const logo = await readFile(
		path.join(process.cwd(), "public/images/gdhub-mark-512.png"),
	);
	const avatar = await uploadMatrixAvatarBytes(
		logo.buffer.slice(logo.byteOffset, logo.byteOffset + logo.byteLength),
		"image/png",
	);
	if (avatar) {
		await matrixRequest(
			"PUT",
			`/_matrix/client/v3/profile/${encodeURIComponent(gdhubMatrixId())}/avatar_url`,
			{ avatar_url: avatar },
		);
	}
	return avatar ?? "";
}

/**
 * Who may post, and what everyone else may do: react, and take their own
 * reaction back. `redact` stays high, so a member's redaction can only ever
 * remove their own event.
 */
function announcementsPowerLevels() {
	return {
		users: { [gdhubMatrixId()]: 100 },
		users_default: 0,
		events_default: 100,
		state_default: 100,
		invite: 100,
		kick: 100,
		ban: 100,
		redact: 100,
		notifications: { room: 100 },
		events: { "m.reaction": 0, "m.room.redaction": 0 },
	};
}

/** The one Announcements room, created on first need. */
export async function ensureAnnouncementsRoom(): Promise<string> {
	// Every post and edit asks: a plain read answers all but the very first.
	const existing = await prisma.chatRoom.findUnique({
		where: { directKey: ANNOUNCEMENTS_DIRECT_KEY },
		select: { matrixRoomId: true },
	});
	if (existing?.matrixRoomId) return existing.matrixRoomId;

	const row = await prisma.chatRoom.upsert({
		where: { directKey: ANNOUNCEMENTS_DIRECT_KEY },
		create: {
			kind: ChatRoomKind.Announcements,
			directKey: ANNOUNCEMENTS_DIRECT_KEY,
			title: ANNOUNCEMENTS_ROOM_NAME,
			isDirect: false,
			status: ChatRoomStatus.Open,
		},
		update: {},
		select: { id: true, matrixRoomId: true },
	});
	if (row.matrixRoomId) return row.matrixRoomId;

	const avatar = await ensureGdhubAccount();
	const alias = `room-${row.id}`;

	let roomId: string;
	try {
		({ room_id: roomId } = await matrixRequest<{ room_id: string }>(
			"POST",
			"/_matrix/client/v3/createRoom",
			{
				room_alias_name: alias,
				name: ANNOUNCEMENTS_ROOM_NAME,
				topic: ANNOUNCEMENTS_ROOM_TOPIC,
				preset: "private_chat",
				visibility: "private",
				is_direct: false,
				power_level_content_override: announcementsPowerLevels(),
				initial_state: [
					// A member who joins later still reads every earlier post.
					{
						type: "m.room.history_visibility",
						state_key: "",
						content: { history_visibility: "shared" },
					},
					{
						type: "m.room.guest_access",
						state_key: "",
						content: { guest_access: "forbidden" },
					},
					...(avatar
						? [
								{
									type: "m.room.avatar",
									state_key: "",
									content: { url: avatar },
								},
							]
						: []),
				],
			},
		));
	} catch (error) {
		// A crash between createRoom and the write below leaves the alias taken
		// and the row empty: adopt the room instead of wedging the key.
		if (!String(error).includes("M_ROOM_IN_USE")) throw error;
		({ room_id: roomId } = await matrixRequest<{ room_id: string }>(
			"GET",
			`/_matrix/client/v3/directory/room/${encodeURIComponent(
				`#${alias}:${env("MATRIX_CHAT_HOMESERVER_DOMAIN")}`,
			)}`,
		));
	}

	await prisma.chatRoom.update({
		where: { id: row.id },
		data: { matrixRoomId: roomId },
	});
	return roomId;
}

const joinedKey = (userId: string) => `chat:announcements:joined:${userId}`;

/**
 * Put a user in the channel without an invite screen. Cheap to call on every
 * chat session: a confirmed membership is remembered for a day, after which a
 * user who left through another Matrix client is brought back.
 */
export async function joinAnnouncements(userId: string): Promise<void> {
	if (await cacheGet<boolean>(joinedKey(userId))) return;

	const roomId = await ensureAnnouncementsRoom();
	// 403 means already joined or invited — the join below settles both.
	await inviteUserToRoom(GDHUB_MATRIX_LOCALPART, roomId, userId);
	if (await autoJoinRoom(roomId, userId)) {
		await cacheSet(joinedKey(userId), true, ANNOUNCEMENTS_JOIN_RECHECK_SECONDS);
	}
}

/** Founders (super admins) and hub admins write announcements. Read fresh. */
export async function canPostAnnouncements(
	user: SessionUser,
): Promise<boolean> {
	return isStaff(await getSpaceAccess("hub", null, user));
}

async function sendAsGdhub(content: Record<string, unknown>): Promise<void> {
	const roomId = await ensureAnnouncementsRoom();
	await matrixRequest(
		"PUT",
		`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${crypto.randomUUID()}`,
		content,
	);
}

/** Post as GDHub. A picture and its text are one event: the text is its caption. */
export async function postAnnouncement(
	post: ChatMessagePayload,
): Promise<void> {
	await sendAsGdhub(messageContent(post));
}

/**
 * Replace a post's text or image, as GDHub. Clients only honour an edit from
 * the original sender, so a stray id can never rewrite someone else's event.
 */
export async function editAnnouncement(
	eventId: string,
	change: ChatMessagePayload,
): Promise<void> {
	await sendAsGdhub(editContent(eventId, messageContent(change)));
}

/** Remove a post for everyone, as GDHub. Scoped to the Announcements room. */
export async function deleteAnnouncement(eventId: string): Promise<void> {
	const roomId = await ensureAnnouncementsRoom();
	await matrixRequest(
		"PUT",
		`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/redact/${encodeURIComponent(eventId)}/${crypto.randomUUID()}`,
		{},
	);
}
