import {
	ArtifactCheckStatus,
	CheckpointItemKind,
	CheckpointStatus,
	ProjectStatus,
	TeamMemberStatus,
} from "@gdhub-io/gdhub-prisma";
import {
	CHECKPOINT_ENTRY_ITEMS_MAX,
	CHECKPOINT_OPEN_STATUSES,
} from "@/config/checkpoint";
import {
	createDraftCheckpoint,
	replaceCheckpointItems,
	toArtifactRef,
} from "@/repositories/checkpoint.repository";
import { checkpointNumber } from "@/repositories/checkpoint-number";
import { ensureCheckpointStage } from "@/repositories/project-workflow";
import { prisma } from "@/services/prisma";
import type {
	CheckpointArtifactRef,
	EntryItemDto,
	EntryProjectInput,
	EntryProjectPrefillDto,
	EntryStatusDto,
} from "@/types/checkpoints";

/**
 * The checkpoint entry hub (`/checkpoint/new`): who the author is, which project
 * they head for a checkpoint with, and what that project already has.
 *
 * "What's done so far" is stored as the `Input` items of the project's draft
 * checkpoint, so the wizard that follows opens on the same lines.
 */

/** A project whose author may still head for a checkpoint with it. */
const LISTED_PROJECT_STATUSES = {
	notIn: [
		ProjectStatus.Archived,
		ProjectStatus.Rejected,
		ProjectStatus.KilledWithDignity,
	],
};

const PROJECTS_LIMIT = 50;

const artifactRefSelect = {
	id: true,
	name: true,
	type: true,
	link: true,
	checkStatus: true,
} as const;

type ItemRow = {
	kind: CheckpointItemKind;
	text: string;
	cut: boolean;
	artifact: CheckpointArtifactRef | null;
};

const toEntryItem = (
	item: Pick<ItemRow, "text" | "artifact">,
): EntryItemDto => ({
	text: item.text,
	artifact: item.artifact ? toArtifactRef(item.artifact) : null,
});

/** Founder of the project's team — the one who buys its checkpoints. */
export const isProjectFounder = async (userId: string, projectId: string) =>
	(await prisma.teamMember.count({
		where: {
			userId,
			status: TeamMemberStatus.Founder,
			team: { projectId },
		},
	})) > 0;

/**
 * What a closed checkpoint hands the next one: its delivered outcomes first —
 * not cut, proven by an artifact the backend could open — then its own inputs.
 * A missed outcome is not something the project has, so it is left behind.
 */
export const carryOverItems = (items: ItemRow[]): EntryItemDto[] =>
	[
		...items.filter(
			(item) =>
				item.kind === CheckpointItemKind.Outcome &&
				!item.cut &&
				item.artifact?.checkStatus === ArtifactCheckStatus.Readable,
		),
		...items.filter((item) => item.kind === CheckpointItemKind.Input),
	]
		.slice(0, CHECKPOINT_ENTRY_ITEMS_MAX)
		.map(toEntryItem);

const draftInputsSelect = {
	id: true,
	projectId: true,
	items: {
		where: { kind: CheckpointItemKind.Input },
		orderBy: { order: "asc" },
		select: { text: true, artifact: { select: artifactRefSelect } },
	},
} as const;

export const getEntryStatus = async (
	userId: string,
): Promise<EntryStatusDto> => {
	const [profile, specialities, projects] = await Promise.all([
		prisma.profile.findUnique({
			where: { userId },
			select: { name: true },
		}),
		prisma.speciality.count({ where: { userId } }),
		prisma.project.findMany({
			where: {
				status: LISTED_PROJECT_STATUSES,
				team: {
					members: { some: { userId, status: TeamMemberStatus.Founder } },
				},
			},
			orderBy: { updatedAt: "desc" },
			take: PROJECTS_LIMIT,
			select: {
				id: true,
				slug: true,
				name: true,
				coverImage: true,
				workflow: { select: { currentStep: { select: { name: true } } } },
				checkpoints: {
					where: { status: { in: CHECKPOINT_OPEN_STATUSES } },
					select: { id: true },
					take: 1,
				},
			},
		}),
	]);

	// Item 2 is saved with at least one line, so a draft without any is one the
	// wizard opened on its own and not what the hub is asking about.
	const projectIds = projects.map((project) => project.id);
	const [draft, closed] = projects.length
		? await Promise.all([
				prisma.projectCheckpoint.findFirst({
					where: {
						projectId: { in: projects.map((project) => project.id) },
						status: CheckpointStatus.Draft,
						items: { some: { kind: CheckpointItemKind.Input } },
					},
					orderBy: { updatedAt: "desc" },
					select: draftInputsSelect,
				}),
				prisma.projectCheckpoint.count({
					where: {
						projectId: { in: projectIds },
						status: CheckpointStatus.Closed,
					},
				}),
			])
		: [null, 0];

	return {
		aboutDone: Boolean(profile?.name.trim()) && specialities > 0,
		hadCheckpoint: closed > 0,
		projects: projects.map((project) => ({
			id: project.id,
			slug: project.slug,
			name: project.name,
			cover: project.coverImage,
			stage: project.workflow?.currentStep?.name ?? null,
			running: project.checkpoints.length > 0,
		})),
		draft: draft
			? {
					id: draft.id,
					projectId: draft.projectId,
					items: draft.items.map(toEntryItem),
				}
			: null,
	};
};

const findDraft = (projectId: string) =>
	prisma.projectCheckpoint.findFirst({
		where: { projectId, status: CheckpointStatus.Draft },
		orderBy: { createdAt: "desc" },
		select: draftInputsSelect,
	});

export const getEntryPrefill = async (
	projectId: string,
): Promise<EntryProjectPrefillDto> => {
	const draft = await findDraft(projectId);
	if (draft?.items.length) {
		return { items: draft.items.map(toEntryItem), carriedFrom: null };
	}

	const previous = await prisma.projectCheckpoint.findFirst({
		where: { projectId, status: CheckpointStatus.Closed },
		orderBy: { decidedAt: "desc" },
		select: {
			projectId: true,
			createdAt: true,
			items: {
				where: {
					kind: { in: [CheckpointItemKind.Outcome, CheckpointItemKind.Input] },
				},
				orderBy: { order: "asc" },
				select: {
					kind: true,
					text: true,
					cut: true,
					artifact: { select: artifactRefSelect },
				},
			},
		},
	});
	if (!previous) return { items: [], carriedFrom: null };

	return {
		items: carryOverItems(previous.items),
		carriedFrom: await checkpointNumber(previous),
	};
};

/** Artifact ids among `ids` that are not the project's own. */
export const foreignArtifactIds = async (projectId: string, ids: string[]) => {
	const unique = [...new Set(ids)];
	if (!unique.length) return [];

	const own = await prisma.projectArtifact.findMany({
		where: { id: { in: unique }, projectId },
		select: { id: true },
	});
	const ownIds = new Set(own.map((artifact) => artifact.id));

	return unique.filter((id) => !ownIds.has(id));
};

/**
 * Writes item 2: the project's draft — reused, or opened now — carries exactly
 * these lines as its inputs. A reused draft follows the project's stage, which
 * may just have moved off Introduction.
 */
export const saveEntryProject = async ({
	projectId,
	items,
}: EntryProjectInput) => {
	const existing = await findDraft(projectId);
	let draftId: string;

	if (existing) {
		const stage = await ensureCheckpointStage(projectId);
		await prisma.projectCheckpoint.update({
			where: { id: existing.id },
			// `updatedAt` too: the hub offers back the draft saved last.
			data: {
				...(stage ? { stepId: stage.id, stageName: stage.name } : null),
				updatedAt: new Date(),
			},
		});
		draftId = existing.id;
	} else {
		draftId = (await createDraftCheckpoint(projectId)).id;
	}

	await replaceCheckpointItems(draftId, CheckpointItemKind.Input, items);

	return draftId;
};
