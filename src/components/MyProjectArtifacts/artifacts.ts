import {
	ArtifactCheckStatus,
	ProjectArtifactType,
} from "@/config/prisma-enums";

/** "What it is" is two sentences, not a document. */
export const ARTIFACT_DESCRIPTION_MAX = 280;

export const ARTIFACT_KINDS = [
	"video",
	"document",
	"image",
	"build",
	"other",
] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

/** The schema stores one `type`; the page talks in kinds derived from it. */
const KIND_OF_TYPE: Record<ProjectArtifactType, ArtifactKind> = {
	[ProjectArtifactType.GameplayVideo]: "video",
	[ProjectArtifactType.PrototypeVideo]: "video",
	[ProjectArtifactType.Concept]: "document",
	[ProjectArtifactType.GDD]: "document",
	[ProjectArtifactType.JDA]: "document",
	[ProjectArtifactType.NDA]: "document",
	[ProjectArtifactType.Other]: "other",
	[ProjectArtifactType.Art]: "image",
	[ProjectArtifactType.ExecutableBuild]: "build",
};

export const kindOfType = (type: ProjectArtifactType): ArtifactKind =>
	KIND_OF_TYPE[type];

/** The types a kind can be saved as, the first being what the form starts on. */
export const TYPES_OF_KIND: Record<ArtifactKind, ProjectArtifactType[]> = {
	video: [
		ProjectArtifactType.PrototypeVideo,
		ProjectArtifactType.GameplayVideo,
	],
	document: [
		ProjectArtifactType.Concept,
		ProjectArtifactType.GDD,
		ProjectArtifactType.JDA,
		ProjectArtifactType.NDA,
	],
	image: [ProjectArtifactType.Art],
	build: [ProjectArtifactType.ExecutableBuild],
	other: [ProjectArtifactType.Other],
};

export type ArtifactListItem = {
	id: string;
	type: ProjectArtifactType;
	name: string | null;
	link: string;
	createdAt: string;
	updatedAt?: string;
	checkStatus: ArtifactCheckStatus | null;
	checkNote: string | null;
	createdByUser: { name: string | null; image: string | null };
	step: { id: string; name: string; order: number } | null;
	/** The checkpoint tasks it was picked to prove; the checkpoints say so, not the artifact. */
	evidence: { checkpointNumber: number; tasks: string[] }[];
};

/** Stage in workflow order, then date; artifacts with no stage go last. */
export const sortArtifacts = (artifacts: ArtifactListItem[]) =>
	[...artifacts].sort(
		(a, b) =>
			(a.step?.order ?? Number.POSITIVE_INFINITY) -
				(b.step?.order ?? Number.POSITIVE_INFINITY) ||
			a.createdAt.localeCompare(b.createdAt),
	);

const stageKey = (artifact: ArtifactListItem) =>
	artifact.step?.id ?? "unsorted";

export type ArtifactRow =
	| { key: string; row: "stage"; name: string | null; count: number }
	| { key: string; row: "artifact"; artifact: ArtifactListItem }
	| { key: string; row: "fix"; artifact: ArtifactListItem };

/**
 * One page of sorted artifacts with a band above each stage. The band counts
 * the stage across `all` pages, not how many of it fit on this one.
 */
export const toRows = (
	page: ArtifactListItem[],
	all: ArtifactListItem[],
): ArtifactRow[] => {
	const counts = new Map<string, number>();
	for (const artifact of all) {
		const key = stageKey(artifact);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	const rows: ArtifactRow[] = [];
	let stage: string | undefined;

	for (const artifact of page) {
		const key = stageKey(artifact);

		if (key !== stage) {
			stage = key;
			rows.push({
				key: `stage-${key}`,
				row: "stage",
				name: artifact.step?.name ?? null,
				count: counts.get(key) ?? 0,
			});
		}

		rows.push({ key: artifact.id, row: "artifact", artifact });
		// Frame A01: what went wrong and how to fix it, under the row itself.
		if (artifact.checkStatus === ArtifactCheckStatus.Unreachable) {
			rows.push({ key: `${artifact.id}-fix`, row: "fix", artifact });
		}
	}

	return rows;
};

/** A check still on its way: started within the last couple of minutes. */
export const isBeingChecked = (artifact: ArtifactListItem, now = Date.now()) =>
	artifact.checkStatus === ArtifactCheckStatus.Pending &&
	now - Date.parse(artifact.updatedAt ?? artifact.createdAt) < 2 * 60 * 1000;
