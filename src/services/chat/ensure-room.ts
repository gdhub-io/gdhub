import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import * as sdk from "matrix-js-sdk";
import { EventType, MsgType } from "matrix-js-sdk";
import { env } from "@/helpers/env";
import { ensureMatrixUser, getMatrixUserToken } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";

export type EnsureChatRoomArgs = {
	kind: prismaClient.ChatRoomKind;
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
	} = args;

	// Registry row first so we have a stable id for the room alias.
	const row = await prisma.chatRoom.upsert({
		where: { directKey },
		create: {
			kind,
			directKey,
			title,
			isDirect,
			context: (context ?? undefined) as prismaClient.Prisma.InputJsonValue,
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

	const session = await getMatrixUserToken(initiatorUserId);

	// Fresh client per request — never reuse the shared singleton, which would
	// leak one user's token across requests.
	const client = sdk.createClient({
		baseUrl: env("MATRIX_CHAT_BASE_URL"),
		accessToken: session.accessToken,
		userId: initiatorMatrixId,
		deviceId: session.deviceId,
	});

	const room = await client.createRoom({
		room_alias_name: `room-${row.id}`,
		name: title,
		topic: topic || undefined,
		is_direct: isDirect,
		invite: inviteeMatrixIds,
	});

	if (avatarUrl) {
		try {
			const file = await fetch(avatarUrl).then((res) => res.blob());
			const uploaded = await client.uploadContent(file, {
				type: "image/png",
				name: `room-${row.id}-avatar.png`,
			});
			await client.sendStateEvent(room.room_id, EventType.RoomAvatar, {
				url: uploaded.content_uri || undefined,
			});
		} catch (error) {
			console.error("[chat] avatar upload failed", error);
		}
	}

	if (firstMessage) {
		try {
			await client.sendEvent(room.room_id, EventType.RoomMessage, {
				msgtype: MsgType.Text,
				body: firstMessage,
			});
		} catch (error) {
			console.error("[chat] first message failed", error);
		}
	}

	await prisma.chatRoom.update({
		where: { id: row.id },
		data: {
			matrixRoomId: room.room_id,
			status: prismaClient.ChatRoomStatus.Open,
		},
	});

	return { chatRoomId: row.id, roomId: room.room_id, created: true };
}
