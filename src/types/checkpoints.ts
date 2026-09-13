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
