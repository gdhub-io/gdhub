import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import { planCloses } from "@/lib/checkpoint-call";
import { dateOfDay } from "@/lib/checkpoint-plan";
import { scopeWindow } from "@/lib/checkpoint-scope";
import type { CheckpointDto, CheckpointSprintDto } from "@/types/checkpoints";

/**
 * "Before the next session": what a sprint asks of the team, each line ticked
 * from data rather than by hand — a box the author could tick themselves would
 * say nothing the curator can rely on.
 */

export type ChecklistKey =
	| "verdict"
	| "plan"
	| "priorities"
	| "build"
	| "devlog"
	| "artifacts";

/**
 * Where the plan stands: to be written, sent for the AI's check, approved;
 * on day 15 waiting for the review or the call, then open to change.
 */
export type PlanStep = "write" | "send" | "approve" | "waiting" | "open";

export type ChecklistItem = {
	key: ChecklistKey;
	done: boolean;
	/** The plan's line only: what it waits for now. */
	step?: PlanStep;
	/** The call's line only, once it is behind: who came. */
	call?: "team" | "noTeam" | "missed";
	/** The day it is due, as a UTC midnight. */
	dueAt: string | null;
};

export const sprintChecklist = (
	checkpoint: CheckpointDto,
	sprint: CheckpointSprintDto,
	hasPreviousCheckpoint: boolean,
	now = new Date(),
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

	const plan = planItem(checkpoint, sprint.number, now);
	if (plan) items.push(plan);

	// Only a person holds a call; the AI curator's review is read, not attended.
	if (checkpoint.curatorKind === CheckpointCuratorKind.Human) {
		const call = session?.missed
			? "missed"
			: session?.teamJoined === true
				? "team"
				: session?.teamJoined === false
					? "noTeam"
					: undefined;
		items.push({
			key: "priorities",
			done: call === "team",
			call,
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

	// Evidence for a task, or anything else the sprint added beside its build.
	const proved = checkpoint.evidence?.some(
		(item) => item.sprint === sprint.number && item.itemIds.length > 0,
	);
	const shown = (checkpoint.sprintArtifacts ?? []).some(
		(artifact) =>
			artifact.sprint === sprint.number && artifact.id !== build?.id,
	);
	items.push({
		key: "artifacts",
		done: !!proved || shown,
		dueAt: devlogDueAt,
	});

	return items;
};

/**
 * The plan's line: set on day 1 (sprint 1), changed once on day 15 (sprint 3).
 * With the AI curator it is written, sent for its one check, then approved;
 * with a person it is drafted for call 1 and agreed on it.
 */
const planItem = (
	checkpoint: CheckpointDto,
	sprint: number,
	now = new Date(),
): ChecklistItem | null => {
	const ai = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const { startedAt } = checkpoint;
	if (!startedAt) return null;

	if (sprint === 1) {
		if (checkpoint.goalAgreedAt)
			return { key: "plan", done: true, dueAt: null };
		const first = checkpoint.sessions?.find((session) => session.index === 1);
		if (!ai) {
			return {
				key: "plan",
				done: false,
				step: "write",
				dueAt: first?.scheduledAt ?? null,
			};
		}
		if (checkpoint.planCheckedAt) {
			return {
				key: "plan",
				done: false,
				step: "approve",
				dueAt: planCloses({ ...checkpoint, startedAt })?.toISOString() ?? null,
			};
		}
		const written = checkpoint.items.some(
			(item) => item.kind === CheckpointItemKind.Outcome && !item.cut,
		);
		return {
			key: "plan",
			done: false,
			step: written ? "send" : "write",
			dueAt: null,
		};
	}

	if (sprint === 3) {
		const { opens, closes } = scopeWindow(
			startedAt,
			checkpoint.sessions,
			checkpoint.curatorKind,
		);
		if (checkpoint.scopeConfirmedAt || now >= closes) {
			return { key: "plan", done: true, dueAt: null };
		}
		return now < opens
			? { key: "plan", done: false, step: "waiting", dueAt: null }
			: { key: "plan", done: false, step: "open", dueAt: closes.toISOString() };
	}
	return null;
};
