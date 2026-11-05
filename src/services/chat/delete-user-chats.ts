import { ChatRoomKind } from "@gdhub-io/gdhub-prisma";
import { deleteMatrixRoom } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";

// Chat cleanup for platform user deletion: a deleted user takes their 1:1
// chats with them — the counterpart loses the history too, by design
// (docs/chat-system.md, Stage 6). Collect BEFORE deletePersonalData (it may
// cascade away the domain rows the lookup needs), execute after it succeeds.

export type UserChatRoomRef = { id: string; matrixRoomId: string | null };

/**
 * Every ChatRoom the user participates in, found via directKey patterns and
 * context fields (until the ChatRoomMember sync exists): Direct pair keys,
 * vacancy chats as the candidate, advice chats on either side, and vacancy
 * chats of the user's own projects (author side).
 */
const AUTHORED_VACANCY_CHUNK = 100;

export async function collectUserChatRooms(
	userId: string,
): Promise<UserChatRoomRef[]> {
	const rooms = new Map<string, UserChatRoomRef>();
	const add = (found: UserChatRoomRef[]) => {
		for (const room of found) rooms.set(room.id, room);
	};

	// Rooms where the user is a participant.
	add(
		await prisma.chatRoom.findMany({
			where: {
				// Shared by everyone: purging it would erase the channel for all.
				kind: { not: ChatRoomKind.Announcements },
				OR: [
					// direct:{minId}:{maxId} and vacancy:{vacancyId}:{candidateId}
					{ directKey: { contains: `:${userId}` } },
					{ context: { path: ["fromUserId"], equals: userId } },
					{ context: { path: ["toUserId"], equals: userId } },
					{ context: { path: ["candidateUserId"], equals: userId } },
					{ context: { path: ["userIds"], array_contains: userId } },
				],
			},
			select: { id: true, matrixRoomId: true },
		}),
	);

	// Author side: chats of the user's own vacancies. Chunked so a prolific
	// author doesn't produce one query with hundreds of OR branches.
	const authoredVacancies = await prisma.teamVacancy.findMany({
		where: { team: { project: { authorId: userId } } },
		select: { id: true },
	});
	for (let i = 0; i < authoredVacancies.length; i += AUTHORED_VACANCY_CHUNK) {
		const chunk = authoredVacancies.slice(i, i + AUTHORED_VACANCY_CHUNK);
		add(
			await prisma.chatRoom.findMany({
				where: {
					OR: chunk.map((vacancy) => ({
						directKey: { startsWith: `vacancy:${vacancy.id}:` },
					})),
				},
				select: { id: true, matrixRoomId: true },
			}),
		);
	}

	return [...rooms.values()];
}

/**
 * Delete the registry rows (ChatRoomMember cascades) and purge the Matrix
 * rooms. Matrix failures are logged, never thrown — the platform deletion has
 * already happened.
 */
export async function deleteUserChats(rooms: UserChatRoomRef[]): Promise<void> {
	if (rooms.length === 0) return;

	await prisma.chatRoom.deleteMany({
		where: { id: { in: rooms.map((room) => room.id) } },
	});

	await Promise.all(
		rooms.map(async (room) => {
			if (!room.matrixRoomId) return;
			try {
				await deleteMatrixRoom(room.matrixRoomId);
			} catch (error) {
				console.error(
					`[chat] matrix room delete failed for ${room.matrixRoomId}`,
					error,
				);
			}
		}),
	);
}
