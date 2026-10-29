import {
	AI_APPROVE_HOURS,
	CALL_CLOSES_MINUTES,
	CALL_MOVE_DAYS,
	CALL_OPENS_MINUTES,
	PRO_PLAN_AFTER_CALL_HOURS,
	SCOPE_SESSION,
	SPRINT_DAYS,
} from "@/config/checkpoint";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import {
	MS_PER_DAY,
	MS_PER_HOUR,
	MS_PER_MINUTE,
	utcStartOfDay,
} from "@/lib/checkpoints/days";
import { scopeState } from "@/lib/checkpoints/scope";

export type CallState = "early" | "open" | "over";

export const callWindow = (scheduledAt: Date) => ({
	opensAt: new Date(scheduledAt.getTime() - CALL_OPENS_MINUTES * MS_PER_MINUTE),
	closesAt: new Date(
		scheduledAt.getTime() + CALL_CLOSES_MINUTES * MS_PER_MINUTE,
	),
});

/**
 * Where call `index` may be moved: the first `CALL_MOVE_DAYS` days of the
 * sprint it opens — days 1–3, 8–10 … and 29–31 for the final call.
 */
export const callMoveWindow = (startedAt: Date, index: number) => {
	const from = new Date(
		utcStartOfDay(startedAt).getTime() + (index - 1) * SPRINT_DAYS * MS_PER_DAY,
	);
	return { from, to: new Date(from.getTime() + CALL_MOVE_DAYS * MS_PER_DAY) };
};

/** Ended by the curator, or past its window: over either way. */
export const callState = (
	scheduledAt: Date,
	endedAt: Date | null,
	now: Date,
): CallState => {
	if (endedAt) return "over";
	const { opensAt, closesAt } = callWindow(scheduledAt);
	if (now < opensAt) return "early";
	return now < closesAt ? "open" : "over";
};

/** Whether a call can be moved now: a running checkpoint with a person, its room not yet open. */
export const isMovable = (
	session: { scheduledAt: Date; endedAt: Date | null },
	checkpoint: {
		status: CheckpointStatus;
		curatorKind: CheckpointCuratorKind | null;
		startedAt: Date | string | null;
	},
	now: Date,
) =>
	checkpoint.status === CheckpointStatus.Active &&
	checkpoint.curatorKind === CheckpointCuratorKind.Human &&
	!!checkpoint.startedAt &&
	callState(session.scheduledAt, session.endedAt, now) === "early";

/** Its window is past and the curator never came in. */
export const callMissed = (
	session: {
		scheduledAt: Date | string;
		curatorJoinedAt: Date | string | null;
		endedAt: Date | string | null;
	},
	now = new Date(),
) =>
	!session.curatorJoinedAt &&
	callState(
		new Date(session.scheduledAt),
		session.endedAt ? new Date(session.endedAt) : null,
		now,
	) === "over";

/** A session behind the checkpoint: a call that is over, or a review the AI has written. */
export const sessionHeld = (
	session: {
		scheduledAt: string;
		endedAt: string | null;
		contentStatus: unknown;
	},
	curatorKind: CheckpointCuratorKind,
	now = new Date(),
) =>
	curatorKind === CheckpointCuratorKind.AI
		? !!session.contentStatus
		: callState(
				new Date(session.scheduledAt),
				session.endedAt ? new Date(session.endedAt) : null,
				now,
			) === "over";

/** cuids carry no dash, so the name splits back into its two parts. */
export const callRoomName = (checkpointId: string, index: number) =>
	`cp-${checkpointId}-${index}`;

export const parseCallRoomName = (name: string) => {
	const match = /^cp-([a-z0-9]+)-(\d+)$/.exec(name);
	return match ? { checkpointId: match[1], index: Number(match[2]) } : null;
};

/**
 * What the plan lets its editors change now: on day 1 the goal and the tasks
 * (`goalAndTasks`); with a pro curator, the tasks alone before call 1
 * (`plan`); the tasks alone, on the record, in the call-3 window; nothing
 * otherwise.
 */
export type PlanEdit = "goalAndTasks" | "plan" | "tasks" | null;

type PlanTimes = {
	curatorKind: CheckpointCuratorKind;
	startedAt: Date | string | null;
	/** Set when the plan is approved: by the author or by itself with the AI curator, on call 1 with a pro one. */
	goalAgreedAt: Date | string | null;
	/** The AI curator's one check of the tasks, once it is written. */
	planCheckedAt?: Date | string | null;
	/** The AI curator's day 15: the author confirmed the tasks; the change is closed. */
	scopeConfirmedAt?: Date | string | null;
};

type PlanSession = {
	index: number;
	scheduledAt: Date | string;
	endedAt: Date | string | null;
};

/**
 * When day 1's goal and tasks close: with the AI curator, when the plan
 * approves itself after the check — null before the check, as it waits for
 * the tasks however long that takes; with a pro curator,
 * PRO_PLAN_AFTER_CALL_HOURS after call 1 ends, or after its room closes if
 * nobody ended it. Null before the checkpoint starts.
 */
export const planCloses = (
	checkpoint: PlanTimes & { sessions?: PlanSession[] },
) => {
	if (!checkpoint.startedAt) return null;
	if (checkpoint.curatorKind === CheckpointCuratorKind.AI) {
		return checkpoint.planCheckedAt
			? new Date(
					new Date(checkpoint.planCheckedAt).getTime() +
						AI_APPROVE_HOURS * MS_PER_HOUR,
				)
			: null;
	}
	const first = checkpoint.sessions?.find((session) => session.index === 1);
	if (!first) return null;
	const ended = first.endedAt
		? new Date(first.endedAt)
		: callWindow(new Date(first.scheduledAt)).closesAt;
	return new Date(ended.getTime() + PRO_PLAN_AFTER_CALL_HOURS * MS_PER_HOUR);
};

export const planEdit = (
	checkpoint: PlanTimes & { sessions: PlanSession[] },
	now = new Date(),
): PlanEdit => {
	const closes = planCloses(checkpoint);
	if (checkpoint.curatorKind === CheckpointCuratorKind.AI) {
		// Open until approved; the hourly run approves it once the check is old enough.
		if (checkpoint.startedAt && !checkpoint.goalAgreedAt) {
			return "goalAndTasks";
		}
	} else {
		const first = checkpoint.sessions.find((session) => session.index === 1);
		const firstCall =
			first &&
			!checkpoint.goalAgreedAt &&
			callState(
				new Date(first.scheduledAt),
				first.endedAt ? new Date(first.endedAt) : null,
				now,
			);
		// Before call 1 the author drafts the tasks; the call and the hours after it open the goal too.
		if (firstCall === "early") return "plan";
		if (firstCall === "open" || (closes && now < closes)) {
			return "goalAndTasks";
		}
	}
	if (
		checkpoint.startedAt &&
		!checkpoint.scopeConfirmedAt &&
		scopeState(
			checkpoint.startedAt,
			checkpoint.sessions,
			now,
			checkpoint.curatorKind,
		) === "open"
	) {
		return "tasks";
	}
	return null;
};

/** The session the plan is open on: the start, or the one that revisits it. */
export const planSession = (edit: PlanEdit) => {
	if (edit === "goalAndTasks" || edit === "plan") return 1;
	if (edit === "tasks") return SCOPE_SESSION;
	return null;
};

/**
 * Whether the curator checked the plan open now: day 1 on the checkpoint,
 * day 15 on its session's content (GDHUB-125, no column for it).
 */
export const planChecked = (
	checkpoint: {
		planCheckedAt: Date | null;
		sessions: { index: number; content?: unknown }[];
	},
	edit: PlanEdit,
) =>
	edit === "tasks"
		? !!(
				checkpoint.sessions.find((session) => session.index === SCOPE_SESSION)
					?.content as { checkedAt?: string } | null | undefined
			)?.checkedAt
		: !!checkpoint.planCheckedAt;
