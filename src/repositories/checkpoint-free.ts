import {
	CHECKPOINT_GOAL_MAX,
	CHECKPOINT_OPEN_STATUSES,
	INPUT_ARTIFACTS,
} from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	ProjectStatus,
} from "@/config/prisma-enums";
import {
	createDraftCheckpoint,
	getCreationBlocker,
} from "@/repositories/checkpoint.repository";
import {
	type AssignCuratorInput,
	assignCurator,
} from "@/repositories/checkpoint-admin";
import { UNSELECTABLE_STAGES } from "@/repositories/project-workflow";
import { prisma } from "@/services/prisma";

/**
 * GDHUB-123: an administrator starts a checkpoint for free, from the list
 * rather than from a draft an author left. The draft is made as an author's
 * would be, given the stage's own goal to rewrite on day 1, and handed over
 * by `assignCurator` — so it starts exactly as a free draft does.
 */

/**
 * Projects that can take one: alive, past Introduction, nothing under way. A
 * project with an author's draft is left out: that draft is given for free
 * from its own row.
 */
const eligible = {
	status: {
		notIn: [
			ProjectStatus.Rejected,
			ProjectStatus.Dormant,
			ProjectStatus.Archived,
			ProjectStatus.KilledWithDignity,
		],
	},
	workflow: { currentStep: { name: { notIn: UNSELECTABLE_STAGES } } },
	checkpoints: {
		none: {
			status: { in: [CheckpointStatus.Draft, ...CHECKPOINT_OPEN_STATUSES] },
		},
	},
};

export type FreeCheckpointProjectDto = {
	id: string;
	name: string;
	stage: string;
	author: string | null;
	/** The goal it would start with. */
	goal: string;
};

export const freeCheckpointProjects = async (
	query: string,
): Promise<FreeCheckpointProjectDto[]> =>
	(
		await prisma.project.findMany({
			where: {
				...eligible,
				...(query && { name: { contains: query, mode: "insensitive" } }),
			},
			orderBy: { updatedAt: "desc" },
			take: 20,
			select: {
				id: true,
				name: true,
				author: { select: { name: true } },
				workflow: { select: { currentStep: { select: { name: true } } } },
			},
		})
	).map((project) => ({
		id: project.id,
		name: project.name,
		stage: project.workflow?.currentStep?.name ?? "",
		author: project.author?.name ?? null,
		goal: stageGoal(project.workflow?.currentStep?.name ?? ""),
	}));

/** The goal a free checkpoint starts with: the stage's own; the author rewrites it on day 1. */
export const stageGoal = (stage: string) =>
	`Do what the ${stage} stage asks for`.slice(0, CHECKPOINT_GOAL_MAX);

/** When the project brought nothing named: its latest artifacts, or one line to fill in on day 1. */
const inputsFromProject = async (projectId: string) => {
	const artifacts = await prisma.projectArtifact.findMany({
		where: { projectId },
		orderBy: { createdAt: "desc" },
		take: INPUT_ARTIFACTS,
		select: { id: true, name: true, type: true },
	});
	return artifacts.length
		? artifacts.map((artifact, index) => ({
				kind: CheckpointItemKind.Input,
				order: index + 1,
				text: artifact.name ?? artifact.type,
				evidence: { create: { artifactId: artifact.id } },
			}))
		: [
				{
					kind: CheckpointItemKind.Input,
					order: 1,
					text: "What the project has today",
				},
			];
};

export type FreeCheckpointInput = AssignCuratorInput & {
	projectId: string;
	/** A person's first call, from their free hours; the five calls are booked from it. */
	firstCall?: Date;
};

export const startFreeCheckpoint = async (
	adminId: string,
	{ projectId, firstCall, ...assign }: FreeCheckpointInput,
) => {
	const human = assign.kind === CheckpointCuratorKind.Human;
	if (human && !firstCall) {
		return { ok: false as const, error: "firstCallMissing" as const };
	}
	const [project, blocker, curator] = await Promise.all([
		prisma.project.findFirst({
			where: { id: projectId, ...eligible },
			select: { id: true },
		}),
		getCreationBlocker(projectId),
		human && assign.userId
			? prisma.user.findUnique({
					where: { id: assign.userId },
					select: { id: true },
				})
			: null,
	]);
	// The same rule a purchase meets; a free one is given even while sales are closed.
	if (!project || (blocker && blocker.reason !== "purchaseClosed")) {
		return { ok: false as const, error: "notEligible" as const };
	}
	if (human && !curator) {
		return { ok: false as const, error: "curatorMissing" as const };
	}

	const draft = await createDraftCheckpoint(projectId);
	// A draft no curator could take is not left behind as the author's own.
	const discard = () =>
		prisma.projectCheckpoint.delete({ where: { id: draft.id } });
	try {
		await prisma.projectCheckpoint.update({
			where: { id: draft.id },
			data: {
				goal: stageGoal(draft.stageName),
				...(human && { startedAt: firstCall }),
				...(!draft.items.some(
					(item) => item.kind === CheckpointItemKind.Input,
				) && {
					items: { create: await inputsFromProject(projectId) },
				}),
			},
		});
		const assigned = await assignCurator(draft.id, adminId, assign);
		if (!assigned.ok) {
			await discard();
			return assigned;
		}
	} catch (error) {
		await discard();
		throw error;
	}
	return { ok: true as const, checkpointId: draft.id };
};
