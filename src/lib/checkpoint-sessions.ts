import { dateOfDay } from "@/lib/checkpoint-plan";
import { SPRINT_DAYS, SPRINTS_PER_CHECKPOINT } from "@/lib/checkpoint-sprints";
import type { CheckpointSessionDto } from "@/types/checkpoints";

/**
 * The five sessions of a checkpoint: the plan on day 1, one opening each of
 * sprints 2–4, and the final one the day after the 28 days.
 */
const SESSIONS_PER_CHECKPOINT = SPRINTS_PER_CHECKPOINT + 1;

/** Session 1 is on day 1, session 5 on day 29. */
export const sessionDay = (index: number) => (index - 1) * SPRINT_DAYS + 1;

type SessionRow = {
	index: number;
	scheduledAt: Date;
	rescheduledAt: Date | null;
	curatorJoinedAt: Date | null;
	endedAt: Date | null;
	contentStatus: CheckpointSessionDto["contentStatus"];
};

/**
 * The stored sessions, or the calendar where none is stored yet. A checkpoint
 * started before sessions were written still has its five days; it just has
 * no hour, which is why `timeKnown` travels with the date.
 */
export const buildSessions = (
	startedAt: Date | null,
	rows: SessionRow[],
): CheckpointSessionDto[] => {
	if (!startedAt) return [];

	return Array.from({ length: SESSIONS_PER_CHECKPOINT }, (_, offset) => {
		const index = offset + 1;
		const row = rows.find((session) => session.index === index);

		return {
			index,
			day: sessionDay(index),
			scheduledAt: (
				row?.scheduledAt ?? dateOfDay(startedAt, sessionDay(index))
			).toISOString(),
			timeKnown: !!row,
			rescheduledAt: row?.rescheduledAt?.toISOString() ?? null,
			curatorJoinedAt: row?.curatorJoinedAt?.toISOString() ?? null,
			endedAt: row?.endedAt?.toISOString() ?? null,
			contentStatus: row?.contentStatus ?? null,
		};
	});
};
