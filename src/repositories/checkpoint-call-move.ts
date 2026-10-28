import { CALL_OPENS_MINUTES } from "@/config/checkpoint";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import { callMoveWindow, callState } from "@/lib/checkpoint-call";
import { MS_PER_MINUTE } from "@/lib/checkpoint-days";
import {
	freeMoveSlots,
	lockCurator,
} from "@/repositories/advisor-availability";
import { notifyCallMove } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";

/**
 * GDHUB-90: a call moved by one side and approved by the other. Either the
 * curator or the project's author asks; the old time stands until the other
 * answers. A call stays in days 1–3 of its sprint, and moves only while its
 * room has not opened — at that point an open request lapses.
 */

export type MoveSide = "curator" | "author";

const sessionSelect = {
	id: true,
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
} as const;

type MoveRow = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

const loadSession = (checkpointId: string, index: number) =>
	prisma.checkpointSession.findUnique({
		where: { checkpointId_index: { checkpointId, index } },
		select: sessionSelect,
	});

export const sideOf = (
	row: { curatorId: string | null; project: { authorId: string } },
	userId: string,
): MoveSide | null => {
	if (row.curatorId === userId) return "curator";
	if (row.project.authorId === userId) return "author";
	return null;
};

/** Whether this call can be moved now: a running checkpoint with a person, its room not yet open. */
export const isMovable = (
	session: {
		scheduledAt: Date;
		endedAt: Date | null;
		checkpoint: {
			status: CheckpointStatus;
			curatorKind: CheckpointCuratorKind | null;
			startedAt: Date | null;
		};
	},
	now: Date,
) =>
	session.checkpoint.status === CheckpointStatus.Active &&
	session.checkpoint.curatorKind === CheckpointCuratorKind.Human &&
	!!session.checkpoint.startedAt &&
	callState(session.scheduledAt, session.endedAt, now) === "early";

type Refusal =
	| "notFound"
	| "notAllowed"
	| "notMovable"
	| "slotTaken"
	| "pendingFromOther"
	| "nothingAsked";

const refuse = (error: Refusal) => ({ ok: false as const, error });

/** The call, who is asking, and whether it may move at all. */
const movable = async (
	checkpointId: string,
	index: number,
	userId: string,
	now: Date,
) => {
	const session = await loadSession(checkpointId, index);
	if (!session) return { refused: refuse("notFound") };
	const side = sideOf(session.checkpoint, userId);
	if (!side) return { refused: refuse("notAllowed") };
	if (!isMovable(session, now) || !session.checkpoint.curatorId) {
		return { refused: refuse("notMovable") };
	}
	return { session, side, curatorId: session.checkpoint.curatorId };
};

/** Free hours in the call's window, never the hour it already has. */
const slotsFor = async (
	session: MoveRow,
	curatorId: string,
	checkpointId: string,
	index: number,
	now: Date,
	db?: Parameters<typeof freeMoveSlots>[3],
) => {
	const window = callMoveWindow(session.checkpoint.startedAt as Date, index);
	const notBefore = new Date(
		now.getTime() + CALL_OPENS_MINUTES * MS_PER_MINUTE,
	);
	const free = await freeMoveSlots(
		curatorId,
		checkpointId,
		{ ...window, notBefore },
		db,
	);
	return {
		...window,
		timeZone: free.timeZone,
		slots: free.slots.filter(
			(slot) => slot.getTime() !== session.scheduledAt.getTime(),
		),
	};
};

export type CallMoveOptionsDto = {
	scheduledAt: string;
	from: string;
	to: string;
	timeZone: string | null;
	slots: string[];
};

/** Where this call may move to, for the move modal (12.08.11). */
export const callMoveOptions = async (
	checkpointId: string,
	index: number,
	userId: string,
	now = new Date(),
) => {
	const { session, curatorId, refused } = await movable(
		checkpointId,
		index,
		userId,
		now,
	);
	if (refused) return refused;

	const options = await slotsFor(session, curatorId, checkpointId, index, now);
	return {
		ok: true as const,
		options: {
			scheduledAt: session.scheduledAt.toISOString(),
			from: options.from.toISOString(),
			to: options.to.toISOString(),
			timeZone: options.timeZone,
			slots: options.slots.map((slot) => slot.toISOString()),
		} satisfies CallMoveOptionsDto,
	};
};

const clearRequest = { moveTo: null, moveAskedById: null, moveAskedAt: null };

/** One side asks for a free hour; asking again replaces their own request. */
export const askCallMove = async (
	checkpointId: string,
	index: number,
	userId: string,
	moveTo: Date,
	now = new Date(),
) => {
	const { session, side, curatorId, refused } = await movable(
		checkpointId,
		index,
		userId,
		now,
	);
	if (refused) return refused;
	if (session.moveAskedById && session.moveAskedById !== userId) {
		return refuse("pendingFromOther");
	}

	const { slots } = await slotsFor(
		session,
		curatorId,
		checkpointId,
		index,
		now,
	);
	if (!slots.some((slot) => slot.getTime() === moveTo.getTime())) {
		return refuse("slotTaken");
	}

	await prisma.checkpointSession.update({
		where: { id: session.id },
		data: { moveTo, moveAskedById: userId, moveAskedAt: now },
	});
	await notifyCallMove(session.id, side === "curator" ? "author" : "curator", {
		event: "asked",
		moveTo,
	});
	return { ok: true as const };
};

/**
 * The other side answers. Approving checks the hour again under the curator's
 * lock — it may have been taken since — and moves only this call.
 */
export const answerCallMove = async (
	checkpointId: string,
	index: number,
	userId: string,
	approve: boolean,
	now = new Date(),
) => {
	const { session, side, curatorId, refused } = await movable(
		checkpointId,
		index,
		userId,
		now,
	);
	if (refused) return refused;
	const { moveTo, moveAskedById } = session;
	if (!moveTo || !moveAskedById) return refuse("nothingAsked");
	if (moveAskedById === userId) return refuse("notAllowed");
	const asker: MoveSide = side === "curator" ? "author" : "curator";

	if (!approve) {
		await prisma.checkpointSession.update({
			where: { id: session.id },
			data: clearRequest,
		});
		await notifyCallMove(session.id, asker, { event: "declined", moveTo });
		return { ok: true as const };
	}

	const moved = await prisma.$transaction(async (tx) => {
		await lockCurator(tx, curatorId);
		const { slots } = await slotsFor(
			session,
			curatorId,
			checkpointId,
			index,
			now,
			tx,
		);
		const free = slots.some((slot) => slot.getTime() === moveTo.getTime());
		await tx.checkpointSession.update({
			where: { id: session.id },
			data: free
				? { ...clearRequest, scheduledAt: moveTo, rescheduledAt: now }
				: clearRequest,
		});
		return free;
	});
	if (!moved) return refuse("slotTaken");

	await notifyCallMove(session.id, asker, { event: "approved", moveTo });
	return { ok: true as const };
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
