import type {
	ArtifactCheckStatus,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	CheckpointVerdict,
	ProjectArtifactType,
} from "@gdhub-io/gdhub-prisma";

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

/** A devlog of this checkpoint, with the curator's answer under it. */
export type CheckpointDevlogDto = {
	id: string;
	publishedAt: string;
	content: string;
	curatorFeedback: string | null;
	curatorFeedbackAt: string | null;
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
	curator: { id: string; name: string | null; image: string | null } | null;
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
	createdAt: string;
	updatedAt: string;
	items: CheckpointItemDto[];
	/** Sent by the detail endpoint only — the list does not carry them. */
	reports?: CheckpointDevlogDto[];
	/** Empty until the checkpoint starts: there are no dates to divide yet. */
	sprints?: CheckpointSprintDto[];
	pulses?: CheckpointPulseRowDto[];
	evidence?: CheckpointEvidenceDto[];
	/** Counted in UTC on the server — see `checkpointProgress`. */
	day: number | null;
	daysLeft: number | null;
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
	| { reason: "noStage" };

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
