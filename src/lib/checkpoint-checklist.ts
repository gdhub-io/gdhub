import { CheckpointCuratorKind } from "@/config/prisma-enums";
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
	/** When it was done, where the line says so ("session 8 Oct"). */
	doneAt: string | null;
};

const addDays = (iso: string, days: number) => {
	const date = new Date(iso);
	date.setUTCDate(date.getUTCDate() + days);

	return date.toISOString();
};

export const sprintChecklist = (
	checkpoint: CheckpointDto,
	sprint: CheckpointSprintDto,
	hasPreviousCheckpoint: boolean,
): ChecklistItem[] => {
	const items: ChecklistItem[] = [];
	const devlogDueAt = addDays(sprint.from, sprint.devlogDay - sprint.firstDay);
	const evidence = (checkpoint.evidence ?? []).filter(
		(item) => item.sprint === sprint.number,
	);

	if (sprint.number === 1 && hasPreviousCheckpoint) {
		items.push({
			key: "verdict",
			done: !!checkpoint.previousVerdictReadAt,
			dueAt: null,
			doneAt: checkpoint.previousVerdictReadAt ?? null,
		});
	}

	// The session that opens a sprint has its number: session 2 opens sprint 2.
	// Only a person holds a call; the AI curator's review is read, not attended.
	if (checkpoint.curatorKind === CheckpointCuratorKind.Human) {
		const session = checkpoint.sessions?.find(
			(item) => item.index === sprint.number,
		);
		items.push({
			key: "priorities",
			done: !!session?.endedAt,
			dueAt: session?.scheduledAt ?? null,
			doneAt: session?.endedAt ?? null,
		});
	}

	const build = checkpoint.builds?.find(
		(item) => item.sprint === sprint.number,
	);
	items.push({
		key: "build",
		done: !!build,
		dueAt: null,
		doneAt: build?.addedAt ?? null,
	});

	const devlog = checkpoint.reports?.find(
		(report) => report.sprint === sprint.number,
	);
	items.push({
		key: "devlog",
		done: !!devlog,
		dueAt: devlogDueAt,
		doneAt: devlog?.publishedAt ?? null,
	});

	const proved = evidence.find((item) => item.itemIds.length > 0);
	items.push({
		key: "artifacts",
		done: !!proved,
		dueAt: devlogDueAt,
		doneAt: proved?.addedAt ?? null,
	});

	return items;
};
