import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import {
	CheckpointJournalKind,
	type CheckpointStatus,
} from "@/config/prisma-enums";
import { currentSprint } from "@/lib/checkpoints/sprints";
import { isRunning } from "@/lib/checkpoints/status";

/**
 * Which AI answers of the curator journal an admin may write again (GDHUB-156),
 * and on which steps. Browser-safe: the drawer and the routes read the same rule.
 */

/** What an AI journal entry is, for regenerating it; null for rows nobody may regenerate. */
export type JournalAnswer =
	| "look"
	| "firstLetter"
	| "planLetter"
	| "advice"
	| "review"
	| "brief"
	| "verdictRead";

type EntryShape = {
	kind: string;
	sprint: number | null;
	input: unknown;
	output: unknown;
};

export const answerOf = (entry: EntryShape): JournalAnswer | null => {
	const input = (entry.input ?? {}) as { letter?: string; moment?: string };
	const output = (entry.output ?? {}) as {
		summary?: unknown;
		audience?: unknown;
		by?: unknown;
		settled?: unknown;
	};
	switch (entry.kind) {
		case CheckpointJournalKind.Evidence:
		case CheckpointJournalKind.Artifact:
		case CheckpointJournalKind.DevlogMedia:
			return "look";
		case CheckpointJournalKind.Letter:
			if (input.letter === "first") return "firstLetter";
			if (input.letter === "plan") return "planLetter";
			return input.moment ? "advice" : null;
		case CheckpointJournalKind.Review:
			// The day-28 report closed the checkpoint with its verdict: never rewritten.
			if (output.summary) return null;
			return output.audience === "curator" ? "brief" : "review";
		case CheckpointJournalKind.Verdict:
			return output.by === "ai" && !output.settled ? "verdictRead" : null;
		default:
			return null;
	}
};

/** The step an entry belongs to: its sprint, day one (0) for the letters before sprint 1. */
export const stepOf = (entry: { sprint: number | null }) => entry.sprint ?? 0;

/**
 * The step of the latest written answer (a letter, a review, a brief, the
 * verdict read). Everything before it has been built on and is fixed; it and
 * the steps after it are open.
 */
export const builtOnStep = (entries: EntryShape[]) =>
	entries.reduce((latest, entry) => {
		const answer = answerOf(entry);
		return answer && answer !== "look"
			? Math.max(latest, stepOf(entry))
			: latest;
	}, 0);

/** Not closed: under way or in its review, and no verdict decided. */
export const checkpointOpen = (checkpoint: {
	status: CheckpointStatus;
	verdict: unknown;
}) => isRunning(checkpoint.status) && !checkpoint.verdict;

type RuleCheckpoint = {
	status: CheckpointStatus;
	verdict: unknown;
	startedAt: Date | null;
};

/** The open-step rule's facts, read once per journal and asked of every entry and step. */
export const openSteps = (
	checkpoint: RuleCheckpoint,
	entries: EntryShape[],
) => ({
	open: checkpointOpen(checkpoint),
	from: builtOnStep(entries),
	startedAt: checkpoint.startedAt,
});

export type OpenSteps = ReturnType<typeof openSteps>;

/**
 * The open-step rule: an AI answer may be regenerated while the checkpoint is
 * open and its step is not older than the step of the latest written answer.
 */
export const canRegenerateIn = (steps: OpenSteps, entry: EntryShape) =>
	steps.open && answerOf(entry) !== null && stepOf(entry) >= steps.from;

export const canRegenerate = (
	checkpoint: RuleCheckpoint,
	entries: EntryShape[],
	entry: EntryShape,
) => canRegenerateIn(openSteps(checkpoint, entries), entry);

/** A step may be rebuilt when it is open by the same rule and has begun. */
export const canRebuildIn = (
	{ open, from, startedAt }: OpenSteps,
	step: number,
	now = new Date(),
) =>
	open &&
	!!startedAt &&
	step >= 0 &&
	step <= SPRINTS_PER_CHECKPOINT &&
	step >= from &&
	step <= currentSprint(startedAt, now);

export const canRebuild = (
	checkpoint: RuleCheckpoint,
	entries: EntryShape[],
	step: number,
	now = new Date(),
) => canRebuildIn(openSteps(checkpoint, entries), step, now);

export type RevisionMode = "regenerate" | "rebuild";

/** One Replace, kept in the entry's `input.revisions`. */
export type JournalRevision = {
	at: string;
	/** The admin's user id. */
	by: string;
	mode: RevisionMode;
	hint: string | null;
	previousOutput: unknown;
};

export const revisionsOf = (input: unknown): JournalRevision[] => {
	const revisions = (input as { revisions?: unknown } | null)?.revisions;
	return Array.isArray(revisions) ? (revisions as JournalRevision[]) : [];
};

/** The entry's input with one more revision; a new input replaces the old one but keeps the history. */
export const withRevision = (
	input: unknown,
	revision: JournalRevision,
	replacement?: Record<string, unknown> | null,
) => ({
	...((replacement ?? input ?? {}) as Record<string, unknown>),
	revisions: [...revisionsOf(input), revision],
});

/** The input without its revision history, as the drawer's Source shows it. */
export const withoutRevisions = (input: unknown) => {
	if (!input || typeof input !== "object" || !("revisions" in input)) {
		return input;
	}
	const { revisions: _, ...rest } = input as Record<string, unknown>;
	return rest;
};

/** An entry's input as its producer takes it again: no revision history, no journal marker. */
export const producerInputOf = <T>(entry: { input: unknown }) => {
	const {
		revisions: _,
		letter: __,
		...input
	} = (entry.input ?? {}) as Record<string, unknown>;
	return input as T;
};
