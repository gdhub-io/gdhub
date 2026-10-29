import { CheckpointStatus } from "@/config/prisma-enums";

/**
 * What a checkpoint's status means, and every move between statuses
 * (docs/checkpoints-status-flow.d2). Nothing else writes `status`: a write
 * spreads `checkpointMove(from, to)` into its `updateMany`, so the status it
 * expects is in the WHERE and of two writers racing only one wins. Browser-safe.
 */

const { Draft, AwaitingCurator, Active, Review, Closed, Cancelled } =
	CheckpointStatus;

/** Holds a curator's hours and blocks a second checkpoint: paid and not yet decided. */
export const CHECKPOINT_OPEN_STATUSES: CheckpointStatus[] = [
	AwaitingCurator,
	Active,
	Review,
];

/** The project's current one: not yet decided or called off. Only one at a time. */
export const CHECKPOINT_CURRENT_STATUSES: CheckpointStatus[] = [
	Draft,
	...CHECKPOINT_OPEN_STATUSES,
];

/** Over, one way or the other: what a curator's fee is settled on. */
export const CHECKPOINT_ENDED_STATUSES: CheckpointStatus[] = [
	Closed,
	Cancelled,
];

/** Under way: the 28 days or their review. Calls, evidence and the verdict live here. */
export const CHECKPOINT_RUNNING_STATUSES: CheckpointStatus[] = [Active, Review];

/** Got its 28 days, whether or not the verdict is in: its pages stay readable. */
export const CHECKPOINT_RAN_STATUSES: CheckpointStatus[] = [
	Active,
	Review,
	Closed,
];

/** Never got a number: a draft, or one whose money went back before it ran. */
export const UNNUMBERED_STATUSES: CheckpointStatus[] = [Draft, Cancelled];

/** Short of day one: a draft, or paid and waiting on its curator. The author may still call it off. */
export const CHECKPOINT_PENDING_STATUSES: CheckpointStatus[] = [
	Draft,
	AwaitingCurator,
];

export const isOpen = (status: CheckpointStatus) =>
	CHECKPOINT_OPEN_STATUSES.includes(status);

export const isRunning = (status: CheckpointStatus) =>
	CHECKPOINT_RUNNING_STATUSES.includes(status);

export const hasRun = (status: CheckpointStatus) =>
	CHECKPOINT_RAN_STATUSES.includes(status);

export const isPending = (status: CheckpointStatus) =>
	CHECKPOINT_PENDING_STATUSES.includes(status);

/** The goal card takes evidence while it is written and while the days run; once judged it is the record. */
export const acceptsEvidence = (status: CheckpointStatus) =>
	status === Draft || status === Active;

export const isNumbered = (status: CheckpointStatus) =>
	!UNNUMBERED_STATUSES.includes(status);

const MOVES: Record<CheckpointStatus, CheckpointStatus[]> = {
	[Draft]: [AwaitingCurator, Active, Cancelled],
	[AwaitingCurator]: [Active, Draft, Cancelled],
	[Active]: [Review, Closed, Cancelled],
	[Review]: [Closed, Cancelled],
	[Closed]: [],
	[Cancelled]: [],
};

export const canMove = (from: CheckpointStatus, to: CheckpointStatus) =>
	MOVES[from].includes(to);

export class IllegalCheckpointMove extends Error {
	constructor(from: CheckpointStatus, to: CheckpointStatus) {
		super(`A checkpoint cannot move from ${from} to ${to}`);
	}
}

/**
 * The WHERE and the data of one move, spread into the write that makes it.
 * Throws for a move the table does not allow: that is a bug, not a race.
 */
export const checkpointMove = (
	from: CheckpointStatus | CheckpointStatus[],
	to: CheckpointStatus,
) => {
	const froms = [from].flat();
	for (const status of froms) {
		if (!canMove(status, to)) throw new IllegalCheckpointMove(status, to);
	}

	return {
		where: { status: { in: froms } },
		data: { status: to },
	};
};
