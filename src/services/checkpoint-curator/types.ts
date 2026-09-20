import type { CheckpointVerdict } from "@/config/prisma-enums";
import type { UnprovenOutcome } from "@/lib/checkpoint-verdict";

/**
 * Inputs and results for the AI curator's four calls.
 *
 * Provider agnostic and free of server-only imports, so the checkpoint page can
 * import the result types to render what the curator wrote. Everything the model
 * is given here is something the platform could already show the author.
 */

export type CuratorLine = {
	id: string;
	text: string;
	/** The wording bought, where the line has since been reworded. */
	originalText?: string | null;
	cut?: boolean;
	/** Set when the line was added on day 15 rather than written on day 1. */
	addedAt?: string | null;
};

export type CuratorGoalCard = {
	goal: string;
	inputs: CuratorLine[];
	outcomes: CuratorLine[];
};

export type CuratorStage = {
	name: string;
	/** What the workflow template says this stage requires, task by task. */
	requirements: string[];
};

export type CuratorOptions = {
	/** Forwarded to the model so the author is answered in their own language. */
	locale?: string;
};

export type CuratorHours = { from: number; to: number };

/**
 * The hours the team says it has, summed over the roster.
 *
 * `stated` is what makes the totals readable: five members and two statements
 * is not the same claim as five members and five. Both ranges are null when
 * nobody stated anything — unknown time, never zero.
 */
export type CuratorTeam = {
	members: number;
	/** How many of them stated any hours at all. */
	stated: number;
	hoursPerWeek: CuratorHours | null;
	/** The same sum over the four sprints of the run. */
	hoursPerRun: CuratorHours | null;
};

/** Day 1: is this reachable in 28 days, and what is missing from the list. */
export type GoalCheckInput = {
	card: CuratorGoalCard;
	stage: CuratorStage;
	/** What the promise is weighed against: the time the team actually has. */
	team: CuratorTeam;
};

/**
 * What the curator has to say about one task.
 *
 * Prose, not a category. The author reads it and edits the task themselves —
 * there is no button that applies a suggestion, so a machine-readable stance
 * would be structure nothing consumes. Trimming, extending and rewording all
 * come out as the same thing: a sentence about that line.
 */
export type ItemNote = {
	/** The task this is about, echoed back from the card. */
	itemId: string;
	note: string;
};

export type GoalCheckResult = {
	reachable: boolean;
	notes: ItemNote[];
	/** Outcomes the stage requires that the card does not promise. */
	missing: string[];
	/** One paragraph the author reads, in their own language. */
	note: string;
};

/** The day after a devlog: what it moves, what it leaves untouched. */
export type DevlogAnswerInput = {
	devlog: { publishedAt: string; content: string; hasVideo: boolean };
	outcomes: CuratorLine[];
};

export type DevlogAnswerResult = {
	/** What is written under the post. It never replaces the post. */
	answer: string;
	/** Outcome ids this devlog moves, and ones still untouched. */
	moves: string[];
	untouched: string[];
};

/** Day 14: the outcomes nothing has been claimed against, and how much is gone. */
export type MidNoteInput = {
	card: CuratorGoalCard;
	/** Computed in code, never by the model — it is a fact, not a judgement. */
	unproven: UnprovenOutcome[];
	day: number;
	devlogs: { publishedAt: string; content: string }[];
};

export type MidNoteResult = {
	note: string;
};

export type CuratorArtifact = {
	itemId: string;
	type: string;
	name: string | null;
	description: string | null;
	link: string;
	readable: boolean;
};

/** Day 28: the report, and the verdict the guardrail then settles. */
export type ReportInput = {
	card: CuratorGoalCard;
	stage: CuratorStage;
	revision: { revisedAt: string; note: string | null } | null;
	artifacts: CuratorArtifact[];
	unproven: UnprovenOutcome[];
	devlogs: { publishedAt: string; content: string }[];
	/** Member by week: who confirmed they worked on it. */
	pulses: { member: string; weeks: boolean[] }[];
};

export type ReportResult = {
	summary: string;
	verdict: CheckpointVerdict;
	verdictNote: string;
};

/**
 * On demand, while the card is a draft: lines for one side of it, for an author
 * staring at an empty list. Nothing is stored — they edit them or throw them away.
 *
 * Which side is asked for decides what the model is shown, so the two are
 * separate shapes rather than one with half its fields unused.
 */
export type SuggestLinesInput =
	| {
			kind: "Outcome";
			/** What the author says the 28 days are for. May still be empty. */
			goal: string;
			/** The Input side as written so far: what the project has today. */
			inputs: string[];
			stage: CuratorStage;
	  }
	| {
			kind: "Input";
			project: { name: string; description: string | null };
			stage: CuratorStage;
			/** What the last closed checkpoint owed, which is what exists now. */
			previousOutcomes: string[];
	  };

export type SuggestLinesResult = {
	lines: string[];
};
