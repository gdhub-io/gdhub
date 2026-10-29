import { CALL_MOVE_DAYS, CALL_OPENS_MINUTES } from "@/config/checkpoint";
import { callMoveWindow, isMovable } from "@/lib/checkpoints/call";
import { MS_PER_DAY, MS_PER_MINUTE } from "@/lib/checkpoints/days";
import { type Db, freeMoveSlots } from "@/repositories/advisor-availability";
import {
	type CheckpointEditor,
	editorOf,
} from "@/repositories/checkpoints/viewer";
import { prisma } from "@/services/prisma";
import type { CallMoveOptionsDto } from "@/types/checkpoint-call";

/**
 * GDHUB-90: a call moved by one side and approved by the other. Either the
 * curator or the project's author asks; the old time stands until the other
 * answers. A call stays in days 1–3 of its sprint, and moves only while its
 * room has not opened — at that point an open request lapses.
 */
const loadSession = (checkpointId: string, index: number) =>
	prisma.checkpointSession.findUnique({
		where: { checkpointId_index: { checkpointId, index } },
		select: {
			id: true,
			checkpointId: true,
			index: true,
			scheduledAt: true,
			endedAt: true,
			moveTo: true,
			moveAskedById: true,
			checkpoint: {
				select: {
					status: true,
					curatorKind: true,
					curatorId: true,
					startedAt: true,
					project: { select: { authorId: true } },
				},
			},
		},
	});

type MoveRow = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

export const otherSide = (side: CheckpointEditor): CheckpointEditor =>
	side === "curator" ? "author" : "curator";

type Refusal =
	| "notFound"
	| "notAllowed"
	| "notMovable"
	| "slotTaken"
	| "pendingFromOther"
	| "nothingAsked";

export const refuse = (error: Refusal) => ({ ok: false as const, error });

/** The call, who is asking, and whether it may move at all. */
export const movable = async (
	checkpointId: string,
	index: number,
	userId: string,
	now: Date,
) => {
	const session = await loadSession(checkpointId, index);
	if (!session) return { refused: refuse("notFound") };
	const side = editorOf(session.checkpoint, userId);
	if (!side) return { refused: refuse("notAllowed") };
	const { curatorId, startedAt } = session.checkpoint;
	if (
		!isMovable(session, session.checkpoint, now) ||
		!curatorId ||
		!startedAt
	) {
		return { refused: refuse("notMovable") };
	}
	return { session, side, curatorId, startedAt };
};

/**
 * Free hours in the call's window, never the hour it already has, and none so
 * soon that the room would already be open.
 */
export const slotsFor = async (
	session: MoveRow,
	curatorId: string,
	startedAt: Date,
	now: Date,
	db?: Db,
) => {
	const window = callMoveWindow(startedAt, session.index);
	const soonest = now.getTime() + CALL_OPENS_MINUTES * MS_PER_MINUTE;
	const slots = await freeMoveSlots(
		curatorId,
		session.checkpointId,
		{ from: new Date(Math.max(window.from.getTime(), soonest)), to: window.to },
		db,
	);
	return {
		window,
		slots: slots.filter(
			(slot) => slot.getTime() !== session.scheduledAt.getTime(),
		),
	};
};

export const isOneOf = (slots: Date[], at: Date) =>
	slots.some((slot) => slot.getTime() === at.getTime());

/** Where this call may move to, for the move modal (12.08.11). */
export const callMoveOptions = async (
	checkpointId: string,
	index: number,
	userId: string,
	now = new Date(),
) => {
	const { session, curatorId, startedAt, refused } = await movable(
		checkpointId,
		index,
		userId,
		now,
	);
	if (refused) return refused;

	const { window, slots } = await slotsFor(session, curatorId, startedAt, now);
	const days = Array.from({ length: CALL_MOVE_DAYS }, (_, offset) => {
		const start = window.from.getTime() + offset * MS_PER_DAY;
		return {
			date: new Date(start).toISOString().slice(0, 10),
			sprintDay: offset + 1,
			slots: slots
				.filter(
					(slot) =>
						slot.getTime() >= start && slot.getTime() < start + MS_PER_DAY,
				)
				.map((slot) => slot.toISOString()),
		};
	});
	return {
		ok: true as const,
		options: {
			scheduledAt: session.scheduledAt.toISOString(),
			days,
		} satisfies CallMoveOptionsDto,
	};
};

export const clearRequest = {
	moveTo: null,
	moveAskedById: null,
	moveAskedAt: null,
};

/** The one who asked takes it back. */
export const withdrawCallMove = async (
	checkpointId: string,
	index: number,
	userId: string,
) => {
	const session = await loadSession(checkpointId, index);
	if (!session) return refuse("notFound");
	if (session.moveAskedById !== userId) return refuse("nothingAsked");

	await prisma.checkpointSession.update({
		where: { id: session.id },
		data: clearRequest,
	});
	return { ok: true as const };
};
