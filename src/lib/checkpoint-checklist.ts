import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { dateOfDay } from "@/lib/checkpoint-plan";
import type { CheckpointDto, CheckpointSprintDto } from "@/types/checkpoints";

/**
 * "Before the next session": what a sprint asks of the team, each line ticked
 * from data rather than by hand — a box the author could tick themselves would
 * say nothing the curator can rely on.
 */

export type ChecklistKey =
	| "verdict"
	| "priorities"
	| "build"
	| "devlog"
	| "artifacts";

export type ChecklistItem = {
	key: ChecklistKey;
	done: boolean;
	/** The day it is due, as a UTC midnight. */
	dueAt: string | null;
};

export const sprintChecklist = (
	checkpoint: CheckpointDto,
	sprint: CheckpointSprintDto,
	hasPreviousCheckpoint: boolean,
): ChecklistItem[] => {
	const items: ChecklistItem[] = [];
	const devlogDueAt = checkpoint.startedAt
		? dateOfDay(checkpoint.startedAt, sprint.devlogDay).toISOString()
		: null;
	// The session that opens a sprint has its number: session 2 opens sprint 2.
	const session = checkpoint.sessions?.find(
		(item) => item.index === sprint.number,
	);

	if (sprint.number === 1 && hasPreviousCheckpoint) {
		items.push({
			key: "verdict",
			done: !!checkpoint.previousVerdictReadAt,
			// Read before the call that sets the new sprint's priorities.
			dueAt: session?.scheduledAt ?? devlogDueAt,
		});
	}

	// Only a person holds a call; the AI curator's review is read, not attended.
	if (checkpoint.curatorKind === CheckpointCuratorKind.Human) {
		items.push({
			key: "priorities",
			done: !!session?.endedAt,
			dueAt: session?.scheduledAt ?? null,
		});
	}

	const build = checkpoint.builds?.find(
		(item) => item.sprint === sprint.number,
	);
	items.push({
		key: "build",
		done: !!build,
		dueAt: devlogDueAt,
	});

	const devlog = checkpoint.reports?.find(
		(report) => report.sprint === sprint.number,
	);
	items.push({
		key: "devlog",
		done: !!devlog,
		dueAt: devlogDueAt,
	});

	const proved = checkpoint.evidence?.find(
		(item) => item.sprint === sprint.number && item.itemIds.length > 0,
	);
	items.push({
		key: "artifacts",
		done: !!proved,
		dueAt: devlogDueAt,
	});

	return items;
};
