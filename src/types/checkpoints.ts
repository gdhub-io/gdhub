import type {
	ArtifactCheckStatus,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
	CheckpointVerdict,
	ProjectArtifactType,
	SkillLevel,
} from "@gdhub-io/gdhub-prisma";
import type { AuthorNextStep } from "@/lib/checkpoint-plan";
import type { VerdictStage } from "@/lib/checkpoint-verdict-window";

/**
 * What the checkpoint endpoints send to the browser.
 *
 * Declared here rather than inferred from the Prisma select: the repository
 * imports the client, and a client component that reaches for its return type
 * drags the whole thing towards the bundle. Dates arrive as ISO strings.
 */

export type CheckpointArtifactRef = {
	id: string;
	name: string | null;
	type: ProjectArtifactType;
	link: string;
	checkStatus: ArtifactCheckStatus | null;
};

export type CheckpointItemDto = {
	id: string;
	kind: CheckpointItemKind;
	order: number;
	text: string;
	/** The wording bought, where the line has since been reworded. */
	originalText: string | null;
	cut: boolean;
	addedAt: string | null;
	note: string | null;
	acceptedNote: string | null;
	artifact: CheckpointArtifactRef | null;
};

/** A devlog of this checkpoint. */
export type CheckpointDevlogDto = {
	id: string;
	publishedAt: string;
	content: string;
	/** Which sprint it landed in, or null for one published outside the 28 days. */
	sprint: number | null;
};

/**
 * One of the four sprints. Stamped by the server, like the day number, so a
 * browser in another timezone cannot put a devlog in a different sprint than the
 * one the verdict will read it from.
 */
export type CheckpointSprintDto = {
	/** 1 to 4. */
	number: number;
	/** First and last day of the sprint, at UTC midnight, both inclusive. */
	from: string;
	to: string;
	/** The same range as day numbers of the checkpoint: sprint 2 is 8 to 14. */
	firstDay: number;
	lastDay: number;
	/** The day the sprint's devlog is due. */
	devlogDay: number;
	state: "done" | "current" | "ahead";
};

/**
 * One of the five sessions: a call with a human curator, a written review with
 * the AI one. Built from the stored row, or from the calendar before one exists.
 */
export type CheckpointSessionDto = {
	/** 1 is the plan, 2–4 open sprints 2–4, 5 is the final one. */
	index: number;
	/** The checkpoint day it falls on: 1, 8, 15, 22 or 29. */
	day: number;
	scheduledAt: string;
	/** False while only the calendar day is known, not the hour. */
	timeKnown: boolean;
	rescheduledAt: string | null;
	curatorJoinedAt: string | null;
	endedAt: string | null;
	contentStatus: CheckpointSessionContentStatus | null;
};

/**
 * One cell of the pulse matrix. `notOnTeam` is blank rather than missed: a member
 * counted absent for sprints they had not joined makes a growing team look like a
 * collapsing one, and the verdict reads this matrix.
 */
export type CheckpointPulseCellDto = {
	sprint: number;
	state: "confirmed" | "waiting" | "missed" | "notAsked" | "notOnTeam";
	confirmedAt: string | null;
	/** "email" | "app" | "devlog" | "artifact" — how the sprint was confirmed. */
	source: string | null;
};

/** A team member's row of the matrix, four cells wide. */
export type CheckpointPulseRowDto = {
	memberId: string;
	userId: string;
	name: string | null;
	image: string | null;
	role: string | null;
	joinedAt: string | null;
	leftAt: string | null;
	/** Checkpoint days with a devlog, an artifact or the pulse answered. */
	activeDays: number[];
	cells: CheckpointPulseCellDto[];
};

/**
 * An artifact offered as evidence and the outcomes it is offered against — more
 * than one is normal, which is why the link is a list and not a field.
 */
export type CheckpointEvidenceDto = {
	artifact: CheckpointArtifactRef;
	addedAt: string;
	addedBy: { id: string; name: string | null; image: string | null } | null;
	itemIds: string[];
	/** Null when it was made before the checkpoint started and carried in. */
	sprint: number | null;
};

export type CheckpointDto = {
	id: string;
	projectId: string;
	stepId: string | null;
	stageName: string;
	order: number;
	status: CheckpointStatus;
	goal: string;
	curatorKind: CheckpointCuratorKind;
	curator: {
		id: string;
		name: string | null;
		image: string | null;
		/** The current row and the page; the closed rows of the list go without. */
		speciality?: { name: string; level: SkillLevel } | null;
	} | null;
	startedAt: string | null;
	dueAt: string | null;
	goalAgreedAt: string | null;
	revisedAt: string | null;
	revisedNote: string | null;
	midNote: string | null;
	summary: string | null;
	verdict: CheckpointVerdict | null;
	verdictNote: string | null;
	decidedAt: string | null;
	acceptedTermsAt: string | null;
	/** When the curator took it on; the workflow says so once. */
	curatorAcceptedAt: string | null;
	/** Set when a curator handed it back; the money was released with it. */
	curatorDeclinedAt: string | null;
	/** Everyone who could not take it: shown on the picker as unavailable. */
	declinedCuratorIds: string[];
	/** Set once a payment completed; what the receipt is fetched by. */
	paymentId: string | null;
	/** The price held or paid, whole units — the only one a replacement may cost. Detail only. */
	heldPrice?: number | null;
	createdAt: string;
	updatedAt: string;
	items: CheckpointItemDto[];
	/** Sent by the detail endpoint only — the list does not carry them. */
	reports?: CheckpointDevlogDto[];
	/** Empty until the checkpoint starts: there are no dates to divide yet. */
	sprints?: CheckpointSprintDto[];
	/** Detail only, and empty until the checkpoint starts. */
	sessions?: CheckpointSessionDto[];
	/**
	 * Builds the project uploaded during the 28 days, whether or not they were
	 * offered as evidence: uploading one is what a sprint asks, proving with it
	 * is a separate step. Detail only.
	 */
	builds?: { id: string; addedAt: string; sprint: number }[];
	/** Counted through the project, not the stage: the third checkpoint is 3. Detail only. */
	number?: number;
	/** When the team first opened the previous checkpoint's verdict. */
	previousVerdictReadAt?: string | null;
	pulses?: CheckpointPulseRowDto[];
	evidence?: CheckpointEvidenceDto[];
	/** The list's current row only, and null while it is still a draft. */
	signals?: CheckpointSignalsDto | null;
	/** The list's current row only: a draft whose last checkout did not go through. */
	paymentFailed?: boolean;
	/** The list's current row only: what its author has to do next, if anything. */
	next?: AuthorNextStep | null;
	/** Counted in UTC on the server — see `checkpointProgress`. */
	day: number | null;
	daysLeft: number | null;
};

/**
 * A checkpoint as the curator sees it: the same row the author gets, plus the
 * project it belongs to — they run several at once, across projects they are
 * not a member of.
 */
export type AdvisorCheckpointDto = CheckpointDto & {
	project: { name: string; slug: string };
};

/** The project as its curator reads it: the game and the shape of its team. */
export type AdvisorProjectDto = {
	name: string;
	description: string | null;
	coverImage: string | null;
	videoLink: string | null;
	startedAt: string;
	updatedAt: string;
	details: {
		genre: string | null;
		platform: string | null;
		setting: string | null;
		visualStyle: string | null;
		audition: string | null;
	};
	links: { platform: string; link: string }[];
	stage: string | null;
	capacity: {
		members: number;
		stated: number;
		hoursPerWeek: { from: number; to: number } | null;
		hoursPerRun: { from: number; to: number } | null;
	};
	/** The founder in their own words, and their IANA zone. */
	author: { experience: string | null; timezone: string | null } | null;
	/** Roles, not people: no name, no face, no link to a profile. */
	team: {
		id: string;
		position: string | null;
		speciality: { name: string; level: string } | null;
		isFounder: boolean;
		/** `[min, max]` a week as stated, or null when nothing was. */
		hoursPerWeek: number[] | null;
		startedAt: string;
		/** Four cells once the 28 days run, none before. */
		pulse: CheckpointPulseCellDto[];
	}[];
	sprints: CheckpointSprintDto[];
	/** How the project's last closed checkpoint ended. */
	previous: { verdict: CheckpointVerdict; note: string | null } | null;
	/** The project's last three, newest first. */
	latestDevlogs: { id: string; publishedAt: string; content: string }[];
	/**
	 * This checkpoint's, newest first; empty until the curator takes it on. No
	 * author: the curator reads the work, not who wrote it up.
	 */
	devlogs: Pick<
		CheckpointDevlogDto,
		"id" | "publishedAt" | "content" | "sprint"
	>[];
};

/** Why another checkpoint cannot be started, or null when one can. */
export type CheckpointBlocker =
	| {
			reason: "checkpointOpen";
			checkpoint: {
				id: string;
				status: CheckpointStatus;
				dueAt: string | null;
				stageName: string;
				order: number;
			};
	  }
	| { reason: "noStage" }
	| { reason: "purchaseClosed" };

/** The three counts the card under way shows — see `checkpointSignals`. */
export type CheckpointSignalsDto = {
	devlogs: { done: number; total: number };
	pulses: { done: number; total: number };
	evidence: { done: number; total: number };
};

export type CheckpointListResponse = {
	/** The one on the go — `Draft`, `Active` or `Review`. */
	current: CheckpointDto | null;
	closed: {
		rows: CheckpointDto[];
		total: number;
		page: number;
		limit: number;
	};
	canCreate: boolean;
	blocker: CheckpointBlocker | null;
};

/** What the verdict modal reads beyond the checkpoint card (frame `vC7gn`). */
export type VerdictContextDto = {
	/** Null once decided; otherwise what the curator may do now. */
	stage: VerdictStage | null;
	dueAt: string | null;
	draft: {
		verdict: CheckpointVerdict | null;
		note: string;
		savedAt: string;
	} | null;
	finalCall: { scheduledAt: string; curatorJoinedAt: string | null } | null;
	currentStage: { name: string; key: string | null };
	/** Null on the workflow's last stage, which hides "Ready for the next stage". */
	nextStage: { name: string; key: string } | null;
	lastBuild: {
		name: string | null;
		link: string;
		domain: string | null;
		createdAt: string;
	} | null;
};

/**
 * A call's notes, written by the cron from the transcript (GDHUB-72). Nobody is
 * named: the recording is one track, so who said what is not known. Tasks are
 * referenced by id so their wording comes from the plan as it stands.
 */
export type CallNotes = {
	inShort: string;
	/** In plan order. */
	discussed: { itemId: string; text: string }[];
	notDiscussed: string[];
	outsidePlan: string[];
	/** `itemId` null is outside the plan; `dueDay` is a day of the checkpoint. */
	agreed: { text: string; itemId: string | null; dueDay: number | null }[];
	questions: string[];
};

/** How the project's last checkpoint ended, read again through the next one's first sprint. */
export type PreviousVerdict = {
	checkpointId: string;
	number: number;
	verdict: CheckpointVerdict;
	note: string | null;
};

/**
 * The AI curator on one task. `suggestion` is a wording to take as it is;
 * `cut` advises dropping the task, `add` lives on `PlanAdvice` instead.
 */
export const TASK_ADVICE_KINDS = [
	"clear",
	"risky",
	"vague",
	"shorten",
	"cut",
	"onTrack",
] as const;

export type TaskAdviceKind = (typeof TASK_ADVICE_KINDS)[number];

export type TaskAdvice = {
	itemId: string;
	kind: TaskAdviceKind;
	note: string;
	suggestion: string | null;
};

/** The AI curator's read of the tasks, given when the plan is saved. */
export type PlanAdvice = {
	tasks: TaskAdvice[];
	/** New tasks it proposes. */
	add: string[];
	/** What the advice answers; an unchanged plan is not read twice. */
	hash: string;
};

/**
 * An AI curator's session: a letter to the team, and on review days the review
 * itself in the call notes' shape — `discussed` is by task, `notDiscussed` what
 * has nothing to show, `agreed` the focus for the next sprint.
 */
export type CuratorReview = {
	message: string;
	notes: CallNotes | null;
	advice: PlanAdvice | null;
};

/** A Stripe promotion code as the admin's Promo codes tab lists it. */
export type PromoCodeDto = {
	id: string;
	code: string;
	/** Exactly one of the two is set. */
	percentOff: number | null;
	/** Minor units, USD. */
	amountOff: number | null;
	timesRedeemed: number;
	maxRedemptions: number | null;
	expiresAt: string | null;
	firstPurchaseOnly: boolean;
	active: boolean;
};

/** What the admin's form sends to create a promotion code. */
export type NewPromoCode = {
	code: string;
	kind: "percent" | "amount";
	/** Percent 1–99, or whole US dollars. */
	value: number;
	/** ISO date-time. */
	expiresAt?: string | null;
	maxRedemptions?: number | null;
	firstPurchaseOnly: boolean;
};

/** A project the checkpoint entry hub can be headed for from. */
export type EntryProjectDto = {
	id: string;
	slug: string;
	name: string;
	cover: string | null;
	/** The workflow stage's name, null when the project has no workflow yet. */
	stage: string | null;
	/** An open checkpoint (awaiting a curator, active or in review): no new purchase. */
	running: boolean;
};

/** One "what's done so far" line: the day-1 state the 28 days are measured from. */
export type EntryItemDto = {
	text: string;
	artifact: CheckpointArtifactRef | null;
};

/** Everything the hub at /checkpoint/new needs, in one call. */
export type EntryStatusDto = {
	/** Profile basics and a speciality are in place. */
	aboutDone: boolean;
	/** The user has paid for a checkpoint before: the hub heads for the "next" one. */
	hadCheckpoint: boolean;
	/** Checkpoints can be bought right now (the CHECKPOINTS_PURCHASE_OPEN switch). */
	purchaseOpen: boolean;
	/** Terms and Privacy are recorded for the user; otherwise "About you" asks for them. */
	termsAccepted: boolean;
	/** A checkpoint already on its way (awaiting a curator, active or in review), newest first. */
	current: {
		id: string;
		number: number;
		projectSlug: string;
		projectName: string;
		status: "AwaitingCurator" | "Active" | "Review";
	} | null;
	projects: EntryProjectDto[];
	/** The draft checkpoint item 2 was saved into, if any. */
	draft: {
		id: string;
		projectId: string;
		items: EntryItemDto[];
	} | null;
};

/** What item 2 saves: the project and 1–5 lines, each with an optional artifact. */
export type EntryProjectInput = {
	projectId: string;
	items: { text: string; artifactId: string | null }[];
};

/** Item 2 opened for a project: its saved lines, or ones carried over from its last checkpoint. */
export type EntryProjectPrefillDto = {
	items: EntryItemDto[];
	/** The number of the checkpoint the lines came from, when they were carried over. */
	carriedFrom: number | null;
};
