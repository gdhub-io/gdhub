import type { CuratorLens, LensWeight } from "@/config/checkpoint";
import type { CheckpointVerdict, EvidenceMatch } from "@/config/prisma-enums";
import type {
	PartlyOutcome,
	TrustedOutcome,
	UnprovenOutcome,
} from "@/lib/checkpoints/verdict";
import type { AiPurpose } from "@/services/ai-usage";
import type { GoalAdvice, TaskSuggestion } from "@/types/checkpoints";

/**
 * Inputs and results for the AI curator's calls.
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
	/** Where the stage has to leave the project (GDHUB-125); null for a stage with none. */
	goal: string | null;
	/** How much each lens says on this stage (GDHUB-126). */
	lenses: Record<CuratorLens, LensWeight>;
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
export type TeamCapacity = {
	members: number;
	/** How many of them stated any hours at all. */
	stated: number;
	hoursPerWeek: CuratorHours | null;
	/** The same sum over the four sprints of the run. */
	hoursPerRun: CuratorHours | null;
};

/** One person on the team as the curator reads them: the role first, no contact. */
export type CuratorMember = {
	name: string;
	role: string;
	level: string | null;
	/** What they stated a week; null when they stated nothing. */
	hoursPerWeek: CuratorHours | null;
	/** The weeks already behind, in order: confirmed working or not. */
	weeks: boolean[];
	/** The day they joined, when it was during the checkpoint; null for the team it started with. */
	joinedOn: string | null;
};

/** A position the project has open now: what the curator may point to before suggesting another. */
export type CuratorOpening = {
	role: string;
	postedOn: string;
	/** How many applied so far. */
	applied: number;
};

/** What the audience was told in a period and how it answered (GDHUB-126). */
export type CuratorMarketing = {
	/** Public devlogs of the period, newest first. */
	devlogs: {
		title: string;
		publishedAt: string;
		applause: number;
		views: number;
	}[];
	/** The project's store page and links, as its page lists them. */
	links: string[];
};

/** The team, in one place for every call: who is on it, their hours and pulse, and the sums. */
export type CuratorTeam = TeamCapacity & {
	people: CuratorMember[];
	openings: CuratorOpening[];
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

/** What the author's profile says they like: the AI curator's character takes its colour from it. */
export type CuratorPersona = {
	genres: string[];
	settings: string[];
	/** Casual, mid-core, hardcore. */
	levels: string[];
};

export type GoalCheckInput = {
	card: CuratorGoalCard;
	/** The character the AI curator plays on this checkpoint, if any. */
	character?: string | null;
	/** The checkpoint's stage, which is the project's stage while it is a draft. */
	workflow: CuratorWorkflow;
	project: CuratorProject;
	author: CuratorAuthor | null;
	/** What the promise is weighed against: the time the team actually has. */
	team: CuratorTeam;
	/** How the project's last checkpoint ended, with the same team behind it. */
	previous: { verdict: CheckpointVerdict; note: string | null } | null;
	/** What happened on the project in the two weeks leading in. */
	picture: string;
	/** What the audience saw in the period (GDHUB-126). */
	marketing: CuratorMarketing;
};

/**
 * Day 1, right after payment (GDHUB-117): the goal is read before any task is
 * written. The letter asks for the tasks; the goal gets its word; and the
 * tasks the curator would start from are suggested, each with why.
 */
export type GoalCheckResult = {
	/** The first letter the author reads, in their own language. */
	note: string;
	goal: GoalAdvice;
	suggestions: TaskSuggestion[];
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
	character?: string | null;
	/** The curator's letters the team has read on this checkpoint, the final review last. */
	journal?: { day: number; text: string }[];
	workflow: CuratorWorkflow;
	revision: { revisedAt: string; note: string | null } | null;
	artifacts: CuratorArtifact[];
	unproven: UnprovenOutcome[];
	/** Outcomes the AI could not see into, counted on trust; the note says so. */
	trusted: TrustedOutcome[];
	/** Outcomes the evidence shows only in part; counted, with a caveat. */
	partly: PartlyOutcome[];
	devlogs: { publishedAt: string; content: string }[];
	/** The team, with each member's weeks: who confirmed they worked on it. */
	team: CuratorTeam;
	/** A human curator's calls, from their notes; empty for the AI curator. */
	calls: { index: number; inShort: string; agreed: string[] }[];
	picture: string;
	/** What the audience saw in the period (GDHUB-126). */
	marketing: CuratorMarketing;
};

export type ReportResult = {
	summary: string;
	verdict: CheckpointVerdict;
	verdictNote: string;
};

/** One entry of the curator's journal: a letter the team already read. */
export type JournalEntry = { day: number; text: string };
