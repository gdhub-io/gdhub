import { ChatRoomKind } from "@gdhub-io/gdhub-prisma";
import { getRoomMemberIds, matrixIdToUserId } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";

/**
 * Who is allowed to see a chat.
 *
 * Matrix membership is the real ACL, but asking Synapse costs an HTTP call per
 * room, so for registry-backed rooms we answer from the same fields the
 * registry already stores: the `directKey` segments and the denormalized
 * context. The one case they don't cover is the *author* side of a vacancy
 * chat — the room only knows the vacancy — so that is resolved with a single
 * batched query.
 *
 * Until `ChatRoomMember` is actually written (docs/chat-system.md §4), this is
 * the cheapest honest answer we have.
 */

export type ParticipationRoom = {
	kind: ChatRoomKind;
	directKey: string | null;
	context: unknown;
};

type RoomContext = {
	fromUserId?: string;
	toUserId?: string;
	candidateUserId?: string;
	userIds?: string[];
	vacancyId?: string;
};

export const participationSelect = {
	kind: true,
	directKey: true,
	context: true,
} as const;

function contextOf(room: ParticipationRoom): RoomContext {
	return (room.context ?? {}) as RoomContext;
}

/** Participation provable from the row alone — no extra query. */
function isLocalParticipant(room: ParticipationRoom, userId: string): boolean {
	if (room.directKey?.split(":").includes(userId)) return true;

	const ctx = contextOf(room);
	return (
		ctx.fromUserId === userId ||
		ctx.toUserId === userId ||
		ctx.candidateUserId === userId ||
		(ctx.userIds?.includes(userId) ?? false)
	);
}

/** Vacancy ids whose project the user authors, out of the given set. */
async function authoredVacancyIds(
	vacancyIds: string[],
	userId: string,
): Promise<Set<string>> {
	if (vacancyIds.length === 0) return new Set();

	const vacancies = await prisma.teamVacancy.findMany({
		where: {
			id: { in: vacancyIds },
			team: { project: { authorId: userId } },
		},
		select: { id: true },
	});

	return new Set(vacancies.map((vacancy) => vacancy.id));
}

/** The subset of `rooms` the user takes part in. One extra query at most. */
export async function filterParticipantRooms<T extends ParticipationRoom>(
	rooms: T[],
	userId: string,
): Promise<T[]> {
	const local = rooms.filter((room) => isLocalParticipant(room, userId));
	if (local.length === rooms.length) return local;

	const pendingVacancyIds = rooms
		.filter(
			(room) =>
				!local.includes(room) && room.kind === ChatRoomKind.VacancyOffer,
		)
		.map((room) => contextOf(room).vacancyId)
		.filter((id): id is string => !!id);

	const authored = await authoredVacancyIds(pendingVacancyIds, userId);
	if (authored.size === 0) return local;

	return rooms.filter(
		(room) =>
			local.includes(room) ||
			(room.kind === ChatRoomKind.VacancyOffer &&
				!!contextOf(room).vacancyId &&
				authored.has(contextOf(room).vacancyId as string)),
	);
}

/**
 * Whether the user belongs to one specific chat.
 *
 * The registry answers most cases for free. When it does not, Matrix
 * membership decides — it is the real ACL, and the registry only ever
 * approximates it: a vacancy chat opened by a project admin who is not the
 * project's author is a legitimate member the `directKey` and the context know
 * nothing about. Reached only after the cheap checks fail, so an ordinary
 * participant never pays for the round-trip.
 */
export async function isChatParticipant(
	room: ParticipationRoom,
	userId: string,
	matrixRoomId?: string | null,
): Promise<boolean> {
	const [allowed] = await filterParticipantRooms([room], userId);
	if (allowed) return true;
	if (!matrixRoomId) return false;

	try {
		const memberIds = await getRoomMemberIds(matrixRoomId);
		return memberIds.map(matrixIdToUserId).includes(userId);
	} catch (error) {
		console.error("[chat] membership lookup failed", error);
		return false;
	}
}
