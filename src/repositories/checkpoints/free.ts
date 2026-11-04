import { CHECKPOINT_GOAL_MAX, INPUT_ARTIFACTS } from "@/config/checkpoint";
import { CheckpointItemKind, ProjectStatus } from "@/config/prisma-enums";
import { CHECKPOINT_CURRENT_STATUSES } from "@/lib/checkpoints/status";
import type { AssignCuratorInput } from "@/repositories/checkpoints/admin";
import { UNSELECTABLE_STAGES } from "@/repositories/project/workflow";
import { prisma } from "@/services/prisma";
import type { FreeCheckpointProjectDto } from "@/types/checkpoints";
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
export const eligible = {
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
			status: { in: CHECKPOINT_CURRENT_STATUSES },
		},
	},
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
export const inputsFromProject = async (projectId: string) => {
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
