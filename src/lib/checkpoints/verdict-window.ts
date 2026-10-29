import {
	FINAL_SESSION,
	VERDICT_DRAFT_FROM_SPRINT,
	VERDICT_DUE_DAYS,
} from "@/config/checkpoint";
import { sessionDay, utcStartOfDay } from "@/lib/checkpoints/days";
import { dateOfDay } from "@/lib/checkpoints/plan";
import { sprintDayRange } from "@/lib/checkpoints/sprints";

/**
 * When a human curator may draft the verdict, when they may send it, and when
 * it is due. Browser-safe: the server refuses outside these times and the
 * modal shows the same ones.
 */

type FinalCall = {
	scheduledAt: Date | string;
	curatorJoinedAt: Date | string | null;
} | null;

/** The day the verdict is due by, at UTC midnight; it is due until that day ends. */
export const verdictDueBy = (dueAt: Date | string) =>
	dateOfDay(dueAt, VERDICT_DUE_DAYS + 1);

export const verdictOverdue = (dueAt: Date | string, now = new Date()) =>
	utcStartOfDay(now) > verdictDueBy(dueAt);

export const verdictDraftOpensAt = (startedAt: Date | string) =>
	dateOfDay(startedAt, sprintDayRange(VERDICT_DRAFT_FROM_SPRINT).firstDay);

/**
 * Sending opens when the final call starts: the curator joining it, or its
 * scheduled hour, whichever is first. A checkpoint whose calls were never
 * written down opens at the start of the call's day.
 */
export const verdictSendOpensAt = (
	startedAt: Date | string,
	finalCall: FinalCall,
) => {
	if (!finalCall) return dateOfDay(startedAt, sessionDay(FINAL_SESSION));

	const scheduled = new Date(finalCall.scheduledAt);
	const joined = finalCall.curatorJoinedAt
		? new Date(finalCall.curatorJoinedAt)
		: null;

	return joined && joined < scheduled ? joined : scheduled;
};

export type VerdictStage = "early" | "draft" | "send";

/**
 * What the curator may do now with a checkpoint that has no verdict: nothing
 * before sprint 4, a draft until the final call starts, and send from then on.
 */
export const verdictStage = (
	startedAt: Date | string,
	finalCall: FinalCall,
	now = new Date(),
): VerdictStage => {
	if (now >= verdictSendOpensAt(startedAt, finalCall)) return "send";
	if (now >= verdictDraftOpensAt(startedAt)) return "draft";
	return "early";
};
