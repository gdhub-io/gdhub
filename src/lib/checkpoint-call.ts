import {
	AI_APPROVE_HOURS,
	CALL_CLOSES_MINUTES,
	CALL_OPENS_MINUTES,
	PRO_PLAN_HOURS,
	SCOPE_SESSION,
} from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { dateOfDay } from "@/lib/checkpoint-plan";
import { scopeState } from "@/lib/checkpoint-scope";

const MINUTE = 60_000;

export type CallState = "early" | "open" | "over";

export const callWindow = (scheduledAt: Date) => ({
	opensAt: new Date(scheduledAt.getTime() - CALL_OPENS_MINUTES * MINUTE),
	closesAt: new Date(scheduledAt.getTime() + CALL_CLOSES_MINUTES * MINUTE),
});

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
	checkedAt?: Date | string | null;
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * When day 1's goal and tasks close: with the AI curator, when the plan
 * approves itself after the check — null before the check, as it waits for
 * the tasks however long that takes; with a pro curator, 36 hours from the
 * start of call 1's day. Null before the checkpoint starts.
 */
export const planCloses = (checkpoint: PlanTimes) => {
	if (!checkpoint.startedAt) return null;
	if (checkpoint.curatorKind === CheckpointCuratorKind.AI) {
		return checkpoint.checkedAt
			? new Date(
					new Date(checkpoint.checkedAt).getTime() + AI_APPROVE_HOURS * HOUR_MS,
				)
			: null;
	}
	const start = new Date(checkpoint.startedAt).getTime();
	return new Date(start + PRO_PLAN_HOURS * HOUR_MS);
};

export const planEdit = (
	checkpoint: PlanTimes & {
		sessions: {
			index: number;
			scheduledAt: Date | string;
			endedAt: Date | string | null;
			/** The AI curator's day-15 review, confirmed once the author is done with the tasks. */
			content?: unknown;
		}[];
	},
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
	const scope = checkpoint.sessions.find(
		(session) => session.index === SCOPE_SESSION,
	);
	if (
		checkpoint.startedAt &&
		!(scope?.content as { approved?: boolean } | null)?.approved &&
		scopeState(checkpoint.startedAt, checkpoint.sessions, now) === "open"
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
