import {
	AI_PLAN_DAYS,
	CALL_CLOSES_MINUTES,
	CALL_OPENS_MINUTES,
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

/** cuids carry no dash, so the name splits back into its two parts. */
export const callRoomName = (checkpointId: string, index: number) =>
	`cp-${checkpointId}-${index}`;

export const parseCallRoomName = (name: string) => {
	const match = /^cp-([a-z0-9]+)-(\d+)$/.exec(name);
	return match ? { checkpointId: match[1], index: Number(match[2]) } : null;
};

/**
 * What the plan lets its editors change now: the tasks freely, goal locked
 * (`plan`) — before call 1, or in the AI curator's first days; the goal and
 * the tasks on call 1 until it ends; the tasks alone, on the record, in the
 * call-3 window; nothing otherwise.
 */
export type PlanEdit = "goalAndTasks" | "plan" | "tasks" | null;

export const planEdit = (
	checkpoint: {
		curatorKind: CheckpointCuratorKind;
		startedAt: Date | string | null;
		goalAgreedAt: Date | string | null;
		sessions: {
			index: number;
			scheduledAt: Date | string;
			endedAt: Date | string | null;
		}[];
	},
	now = new Date(),
): PlanEdit => {
	if (
		checkpoint.curatorKind === CheckpointCuratorKind.AI &&
		checkpoint.startedAt &&
		now < aiPlanCloses(checkpoint.startedAt)
	) {
		return "plan";
	}
	const first = checkpoint.sessions.find((session) => session.index === 1);
	const firstCall =
		first &&
		!checkpoint.goalAgreedAt &&
		callState(
			new Date(first.scheduledAt),
			first.endedAt ? new Date(first.endedAt) : null,
			now,
		);
	if (firstCall === "open") return "goalAndTasks";
	// Before call 1 the author drafts the tasks; the call agrees them, and the goal.
	if (firstCall === "early") return "plan";
	if (
		checkpoint.startedAt &&
		scopeState(checkpoint.startedAt, checkpoint.sessions, now) === "open"
	) {
		return "tasks";
	}
	return null;
};

/** When the AI's opening window shuts: midnight after its last plan day. */
export const aiPlanCloses = (startedAt: Date | string) =>
	dateOfDay(startedAt, AI_PLAN_DAYS + 1);

/** The session the plan is open on: the start, or the one that revisits it. */
export const planSession = (edit: PlanEdit) => {
	if (edit === "goalAndTasks" || edit === "plan") return 1;
	if (edit === "tasks") return SCOPE_SESSION;
	return null;
};
