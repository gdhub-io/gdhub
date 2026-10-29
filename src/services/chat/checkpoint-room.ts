import type { Prisma } from "@gdhub-io/gdhub-prisma";
import { ChatRoomKind, ChatRoomStatus } from "@/config/prisma-enums";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import {
	inviteUserToRoom,
	kickUserFromRoom,
	makeRoomReadOnly,
} from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";
import { autoJoinRoom, ensureChatRoom } from "./ensure-room";

const checkpointRoomKey = (checkpointId: string) =>
	`checkpoint:${checkpointId}`;

/**
 * What the room row keeps: who belongs, so participation needs no Matrix call.
 * The curator is always first — theirs is the session that invites and removes.
 */
type CheckpointRoomContext = {
	checkpointId: string;
	projectId: string;
	userIds: string[];
};

const contextOf = (row: { context: unknown }) =>
	(row.context ?? {}) as Partial<CheckpointRoomContext>;

const writeUserIds = (
	id: string,
	context: Partial<CheckpointRoomContext>,
	userIds: string[],
) =>
	prisma.chatRoom.update({
		where: { id },
		data: { context: { ...context, userIds } as Prisma.InputJsonValue },
	});

/** Let into the room as the team was at the start: invited and joined at once. */
const letIn = async (curatorId: string, roomId: string, userId: string) => {
	await inviteUserToRoom(curatorId, roomId, userId);
	await autoJoinRoom(roomId, userId);
};

/**
 * The checkpoint's chat: its curator and the project's current team. Opened as
 * the checkpoint starts; asking again returns the same room. The team bought
 * the checkpoint and expects the conversation, so they are joined without an
 * invite screen.
 */
export async function ensureCheckpointRoom(checkpointId: string) {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			curatorId: true,
			projectId: true,
			createdAt: true,
			project: {
				select: {
					name: true,
					coverImage: true,
					team: {
						select: {
							members: {
								where: CONFIRMED_MEMBERS,
								select: { userId: true },
							},
						},
					},
				},
			},
		},
	});
	if (!checkpoint?.curatorId) return null;

	const team = [
		...new Set(
			(checkpoint.project.team?.members ?? []).map((member) => member.userId),
		),
	].filter((id) => id !== checkpoint.curatorId);
	const context: CheckpointRoomContext = {
		checkpointId,
		projectId: checkpoint.projectId,
		userIds: [checkpoint.curatorId, ...team],
	};
	// A project runs many checkpoints; the number tells their chats apart.
	const number = await checkpointNumber(checkpoint);

	return ensureChatRoom({
		kind: ChatRoomKind.Checkpoint,
		directKey: checkpointRoomKey(checkpointId),
		title: `${checkpoint.project.name ?? ""} · #${number}`,
		isDirect: false,
		context,
		initiatorUserId: checkpoint.curatorId,
		inviteeUserIds: team,
		avatarUrl: checkpoint.project.coverImage ?? undefined,
		autoJoinInvitees: true,
	});
}

/**
 * The room for someone opening it: made if the start could not make it, and the
 * caller invited if the sync on joining the team did not reach them.
 */
export async function checkpointRoomFor(checkpointId: string, userId: string) {
	const room = await ensureCheckpointRoom(checkpointId);
	if (!room) return null;

	const row = await prisma.chatRoom.findUnique({
		where: { id: room.chatRoomId },
		select: { context: true },
	});
	const context = contextOf(row ?? { context: null });
	const curatorId = context.userIds?.[0];

	if (curatorId && !context.userIds?.includes(userId)) {
		await letIn(curatorId, room.roomId, userId);
		await writeUserIds(room.chatRoomId, context, [
			...(context.userIds ?? []),
			userId,
		]);
	}

	return room.roomId;
}

/** The open checkpoint chats of a project — the ones a team change reaches. */
const openRoomsOf = (projectId: string) =>
	prisma.chatRoom.findMany({
		where: {
			kind: ChatRoomKind.Checkpoint,
			status: ChatRoomStatus.Open,
			matrixRoomId: { not: null },
			context: { path: ["projectId"], equals: projectId },
		},
		select: { id: true, matrixRoomId: true, context: true },
	});

/** Someone joined the team: they are let into every chat of a running checkpoint. */
export async function addToCheckpointRooms(projectId: string, userId: string) {
	for (const room of await openRoomsOf(projectId)) {
		const context = contextOf(room);
		const curatorId = context.userIds?.[0];
		if (!curatorId || !room.matrixRoomId || context.userIds?.includes(userId))
			continue;

		await letIn(curatorId, room.matrixRoomId, userId);
		await writeUserIds(room.id, context, [...(context.userIds ?? []), userId]);
	}
}

/**
 * Someone left the team: they leave its checkpoint chats too. The registry is
 * written first, so the context card stops answering them even if Matrix fails.
 */
export async function removeFromCheckpointRooms(
	projectId: string,
	userId: string,
) {
	for (const room of await openRoomsOf(projectId)) {
		const context = contextOf(room);
		const curatorId = context.userIds?.[0];
		// The curator is never removed by a team change; they are not on the team.
		if (!curatorId || curatorId === userId || !room.matrixRoomId) continue;
		if (!context.userIds?.includes(userId)) continue;

		await writeUserIds(
			room.id,
			context,
			context.userIds.filter((id) => id !== userId),
		);
		await kickUserFromRoom(curatorId, room.matrixRoomId, userId);
	}
}

/**
 * The checkpoint is over: its chat moves to the closed ones and stops taking
 * messages. The history stays readable.
 */
export async function closeCheckpointRoom(checkpointId: string) {
	const room = await prisma.chatRoom.findUnique({
		where: { directKey: checkpointRoomKey(checkpointId) },
		select: { id: true, status: true, matrixRoomId: true },
	});
	if (!room || room.status === ChatRoomStatus.Closed) return;

	await prisma.chatRoom.update({
		where: { id: room.id },
		data: { status: ChatRoomStatus.Closed, finishedAt: new Date() },
	});
	if (room.matrixRoomId) await makeRoomReadOnly(room.matrixRoomId);
}

/**
 * Runs a chat sync after the thing it follows has already happened: a team
 * change or a closed checkpoint must stand whatever Matrix says, so a failure
 * is logged by id and the next click on the chat repairs membership.
 */
export async function syncChat(label: string, run: () => Promise<unknown>) {
	try {
		await run();
	} catch (error) {
		console.error(`checkpoint chat sync failed: ${label}`, error);
	}
}
