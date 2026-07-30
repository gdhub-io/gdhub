import { ChatRoomStatus } from "@gdhub-io/gdhub-prisma";
import { makeRoomReadOnly, sendRoomMessageAs } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";

// Vacancy-chat registry keys and lifecycle helpers, kept free of matrix-js-sdk
// so vacancy CRUD routes and crons don't pull the SDK into their bundles
// (services/matrix/admin.ts is plain HTTP).

/** Deterministic registry key for a vacancy ↔ candidate chat. */
export function vacancyChatDirectKey(
	vacancyId: string,
	candidateUserId: string,
): string {
	return `vacancy:${vacancyId}:${candidateUserId}`;
}

type CloseVacancyChatsOptions = {
	/**
	 * Farewell system message posted into each room right before it is closed
	 * (e.g. "The application was rejected."). Best-effort.
	 */
	notice?: { senderUserId: string; text: string };
};

/**
 * Close vacancy chats: one (vacancy, candidate) pair, or every chat of the
 * vacancy when `candidateUserId` is omitted (vacancy archived/expired). Sets
 * the registry status and best-effort freezes the Matrix rooms — a Matrix
 * failure never blocks the domain operation.
 */
export async function closeVacancyChats(
	vacancyId: string,
	candidateUserId?: string,
	options?: CloseVacancyChatsOptions,
): Promise<number> {
	const where = {
		status: ChatRoomStatus.Open,
		directKey: candidateUserId
			? vacancyChatDirectKey(vacancyId, candidateUserId)
			: { startsWith: `vacancy:${vacancyId}:` },
	};

	const rooms = await prisma.chatRoom.findMany({
		where,
		select: { id: true, matrixRoomId: true },
	});
	if (rooms.length === 0) return 0;

	await prisma.chatRoom.updateMany({
		where: { id: { in: rooms.map((r) => r.id) } },
		data: {
			status: ChatRoomStatus.Closed,
			finishedAt: new Date(),
		},
	});

	await Promise.all(
		rooms.map(async (room) => {
			if (!room.matrixRoomId) return;
			// The farewell must land BEFORE the freeze — a read-only room rejects it.
			if (options?.notice) {
				try {
					await sendRoomMessageAs(
						options.notice.senderUserId,
						room.matrixRoomId,
						options.notice.text,
					);
				} catch (error) {
					console.error(
						`[chat] close notice failed for ${room.matrixRoomId}`,
						error,
					);
				}
			}
			try {
				await makeRoomReadOnly(room.matrixRoomId);
			} catch (error) {
				console.error(
					`[chat] makeRoomReadOnly failed for ${room.matrixRoomId}`,
					error,
				);
			}
		}),
	);

	return rooms.length;
}
