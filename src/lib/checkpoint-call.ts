import { CALL_CLOSES_MINUTES, CALL_OPENS_MINUTES } from "@/config/checkpoint";
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
 * What the plan lets its editors change now: the goal and the tasks on call 1
 * until it ends, the tasks alone in the call-3 window, nothing otherwise.
 */
export type PlanEdit = "goalAndTasks" | "tasks" | null;

export const planEdit = (
	checkpoint: {
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
	const first = checkpoint.sessions.find((session) => session.index === 1);
	if (
		first &&
		!checkpoint.goalAgreedAt &&
		callState(
			new Date(first.scheduledAt),
			first.endedAt ? new Date(first.endedAt) : null,
			now,
		) === "open"
	) {
		return "goalAndTasks";
	}
	if (
		checkpoint.startedAt &&
		scopeState(checkpoint.startedAt, checkpoint.sessions, now) === "open"
	) {
		return "tasks";
	}
	return null;
};
