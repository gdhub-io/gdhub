import { SESSIONS_PER_CHECKPOINT, SPRINT_DAYS } from "@/config/checkpoint";
import { dateOfDay } from "@/lib/checkpoint-plan";
import type { CheckpointSessionDto } from "@/types/checkpoints";

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
