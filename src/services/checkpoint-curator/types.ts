import type { CheckpointVerdict, EvidenceMatch } from "@/config/prisma-enums";
import type {
	PartlyOutcome,
	TrustedOutcome,
	UnprovenOutcome,
} from "@/lib/checkpoint-verdict";
import type { AiPurpose } from "@/services/ai-usage";

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

/** Where the project stands on its workflow, as the template says it. */
export type CuratorWorkflow = {
	currentStage: string;
	/** Where moving on leads; null on the path's last stage. */
	nextStage: string | null;
	/** What the stage is for, written for the curator; null for a stage with none. */
	description: string | null;
	/** The tasks the template requires on this stage, done or not; the optional ones never reach the model. */
	requiredTasks: { name: string; done: boolean }[];
};

export type CuratorOptions = {
	/** Forwarded to the model so the author is answered in their own language. */
	locale?: string;
	/** The checkpoint the tokens are charged to. */
	checkpointId?: string;
	/** What the tokens are charged as, when a call serves more than one purpose. */
	purpose?: AiPurpose;
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

/** What the game is, as its page says. */
export type CuratorProject = {
	name: string;
	pitch: string | null;
	genre: string | null;
};

/** Who heads for the checkpoint: the founder's speciality on the team. */
export type CuratorAuthor = {
	speciality: string;
	level: string;
	/** "Briefly about your experience", null when left empty. */
	experience: string | null;
};

/** Day 1: is this reachable in 28 days, and what is missing from the list. */
export type GoalCheckInput = {
	card: CuratorGoalCard;
	/** The checkpoint's stage, which is the project's stage while it is a draft. */
	workflow: CuratorWorkflow;
	project: CuratorProject;
	author: CuratorAuthor | null;
	/** What the promise is weighed against: the time the team actually has. */
	team: CuratorTeam;
	/** How the project's last checkpoint ended, with the same team behind it. */
	previous: { verdict: CheckpointVerdict; note: string | null } | null;
	/** The project as its page shows it: the stage's path, the team, recent activity. */
	picture: string;
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

/** Day 15: the outcomes nothing has been claimed against, and how much is gone. */
export type MidNoteInput = {
	card: CuratorGoalCard;
	/** Computed in code, never by the model — it is a fact, not a judgement. */
	unproven: UnprovenOutcome[];
	day: number;
	devlogs: { publishedAt: string; content: string }[];
	picture: string;
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
	/** What the AI curator saw in it, against the task (GDHUB-110). */
	seen: { match: EvidenceMatch; note: string | null } | null;
};

/** Day 28: the report, and the verdict the guardrail then settles. */
export type ReportInput = {
	card: CuratorGoalCard;
	workflow: CuratorWorkflow;
	revision: { revisedAt: string; note: string | null } | null;
	artifacts: CuratorArtifact[];
	unproven: UnprovenOutcome[];
	/** Outcomes the AI could not see into, counted on trust; the note says so. */
	trusted: TrustedOutcome[];
	/** Outcomes the evidence shows only in part; counted, with a caveat. */
	partly: PartlyOutcome[];
	devlogs: { publishedAt: string; content: string }[];
	/** Member by week: who confirmed they worked on it. */
	pulses: { member: string; weeks: boolean[] }[];
	/** A human curator's calls, from their notes; empty for the AI curator. */
	calls: { index: number; inShort: string; agreed: string[] }[];
	picture: string;
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
			workflow: CuratorWorkflow;
	  }
	| {
			kind: "Input";
			project: { name: string; description: string | null };
			workflow: CuratorWorkflow;
			/** What the last closed checkpoint owed, which is what exists now. */
			previousOutcomes: string[];
	  };

export type SuggestLinesResult = {
	lines: string[];
};
