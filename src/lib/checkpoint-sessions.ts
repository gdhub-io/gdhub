import { SESSIONS_PER_CHECKPOINT } from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { callMissed } from "@/lib/checkpoint-call";
import { sessionDay } from "@/lib/checkpoint-days";
import { dateOfDay } from "@/lib/checkpoint-plan";
import type { CheckpointSessionDto } from "@/types/checkpoints";

export { sessionDay } from "@/lib/checkpoint-days";

type SessionRow = {
	index: number;
	scheduledAt: Date;
	rescheduledAt: Date | null;
	curatorJoinedAt: Date | null;
	endedAt: Date | null;
	contentStatus: CheckpointSessionDto["contentStatus"];
	attendeeIds?: string[];
};

/**
 * The stored sessions, or the calendar where none is stored yet. A checkpoint
 * started before sessions were written still has its five days; it just has
 * no hour, which is why `timeKnown` travels with the date.
 */
export const buildSessions = (
	startedAt: Date | null,
	rows: SessionRow[],
	curatorKind: CheckpointCuratorKind,
	now = new Date(),
	/** Told apart from the team in a call's attendees. */
	curatorId: string | null = null,
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
			// The AI curator writes rather than joins, so only a call can be missed.
			missed:
				curatorKind !== CheckpointCuratorKind.AI &&
				!!row &&
				callMissed(row, now),
			// Known once the call has ended; an AI review is attended by nobody.
			teamJoined:
				curatorKind === CheckpointCuratorKind.AI || !row?.endedAt
					? null
					: (row.attendeeIds ?? []).some((id) => id !== curatorId),
		};
	});
};
