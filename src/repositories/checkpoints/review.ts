import { createHash } from "node:crypto";
import type { Prisma } from "@gdhub-io/gdhub-prisma";
import { SCOPE_SESSION } from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import { type PlanEdit, planCloses, planEdit } from "@/lib/checkpoints/call";
import { characterFace } from "@/lib/checkpoints/curator-characters";
import { curatorNow } from "@/lib/checkpoints/curator-now";
import { scopeWindow } from "@/lib/checkpoints/scope";
import { currentSessionOf } from "@/lib/checkpoints/sessions";
import { hasRun } from "@/lib/checkpoints/status";
import { toArtifactRef } from "@/repositories/checkpoints/detail";
import {
	checkpointNumber,
	previousVerdict,
} from "@/repositories/checkpoints/number";
import { viewerOf, viewerSelect } from "@/repositories/checkpoints/viewer";
import type { PlanAdviceInput } from "@/services/checkpoints/ai-review";
import { prisma } from "@/services/prisma";
import type { CheckpointReviewDto, CuratorReview } from "@/types/checkpoints";
export const taskSelect = {
	where: { kind: CheckpointItemKind.Outcome },
	orderBy: { order: "asc" },
	select: {
		id: true,
		text: true,
		cut: true,
		addedAt: true,
		originalText: true,
		evidence: {
			orderBy: { createdAt: "asc" },
			select: {
				match: true,
				matchNote: true,
				artifact: {
					select: {
						id: true,
						name: true,
						type: true,
						link: true,
						checkStatus: true,
					},
				},
			},
		},
	},
} as const;

export type TaskRow = {
	id: string;
	cut: boolean;
	evidence: unknown[];
};

/** What a stored advice answers: everything the model is given. */
export const hashOf = ({ picture: _, ...input }: PlanAdviceInput) =>
	// The picture informs the read; the same plan is not read twice for it.
	createHash("sha256")
		.update(JSON.stringify(input))
		.digest("hex");

/** Which page a checkpoint's Curator's Review shows; null for none. */
export const curatorKindOf = async (checkpointId: string) =>
	(
		await prisma.projectCheckpoint.findUnique({
			where: { id: checkpointId },
			select: { curatorKind: true },
		})
	)?.curatorKind ?? null;

/** The session Path to Checkpoint opens on without a sprint asked for. */
export const currentSessionIndex = async (
	checkpointId: string,
	now = new Date(),
) =>
	currentSessionOf(
		await prisma.checkpointSession.findMany({
			where: { checkpointId },
			select: { index: true, scheduledAt: true },
		}),
		now,
	);

/**
 * An AI checkpoint's Curator's Review, all five sessions, for its team. Anyone
 * else, and a checkpoint with a person as curator, gets null.
 */
export const getReview = async (
	checkpointId: string,
	userId: string,
	now = new Date(),
): Promise<CheckpointReviewDto | null> => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			createdAt: true,
			curatorId: true,
			curatorKind: true,
			status: true,
			stageName: true,
			stepId: true,
			goal: true,
			goalAgreedAt: true,
			planCheckedAt: true,
			scopeConfirmedAt: true,
			curatorCharacter: true,
			startedAt: true,
			dueAt: true,
			verdict: true,
			verdictNote: true,
			project: {
				select: {
					...viewerSelect(userId).project.select,
					name: true,
					slug: true,
					workflow: { select: { currentStepId: true } },
				},
			},
			step: {
				select: {
					order: true,
					projectWorkflow: { select: { id: true, title: true } },
				},
			},
			sessions: {
				orderBy: { index: "asc" },
				select: {
					index: true,
					scheduledAt: true,
					endedAt: true,
					contentStatus: true,
					content: true,
				},
			},
			items: taskSelect,
		},
	});
	if (
		!checkpoint?.startedAt ||
		!checkpoint.dueAt ||
		checkpoint.curatorKind !== CheckpointCuratorKind.AI ||
		!hasRun(checkpoint.status)
	) {
		return null;
	}
	const viewer = viewerOf(checkpoint, userId);
	if (!viewer) return null;
	const { project } = checkpoint;
	const current = currentSessionOf(checkpoint.sessions, now);
	const edit = viewer === "team" ? null : planEdit(checkpoint, now);

	const stillOnStage =
		!!checkpoint.stepId &&
		project.workflow?.currentStepId === checkpoint.stepId;
	const [number, previous, next] = await Promise.all([
		checkpointNumber(checkpoint),
		previousVerdict(checkpoint, now),
		stillOnStage && checkpoint.step
			? prisma.projectWorkflowStep.findFirst({
					where: {
						projectWorkflowId: checkpoint.step.projectWorkflow.id,
						order: { gt: checkpoint.step.order },
					},
					orderBy: { order: "asc" },
					select: { order: true, name: true },
				})
			: null,
	]);

	return {
		current,
		curatorNow: curatorNow(
			{ ...checkpoint, startedAt: checkpoint.startedAt },
			now,
		),
		number,
		previous,
		stageName: checkpoint.stageName,
		startedAt: checkpoint.startedAt.toISOString(),
		dueAt: checkpoint.dueAt.toISOString(),
		project: {
			id: checkpoint.projectId,
			name: project.name,
			slug: project.slug,
		},
		plan: {
			goal: checkpoint.goal,
			edit,
			editUntil:
				editUntil(edit, {
					...checkpoint,
					startedAt: checkpoint.startedAt,
				})?.toISOString() ?? null,
			// Day 15 keeps its check on the session (GDHUB-125); day 1 on the checkpoint.
			checked:
				edit === "tasks"
					? !!(
							checkpoint.sessions.find((row) => row.index === SCOPE_SESSION)
								?.content as CuratorReview | null
						)?.checkedAt
					: !!checkpoint.planCheckedAt,
			approved: !!checkpoint.goalAgreedAt,
			tasks: checkpoint.items.map((item) => ({
				id: item.id,
				text: item.text,
				cut: item.cut,
				addedAt: item.addedAt?.toISOString() ?? null,
				artifacts: item.evidence.map(({ artifact }) => toArtifactRef(artifact)),
			})),
		},
		sessions: checkpoint.sessions.map((row) => ({
			index: row.index,
			scheduledAt: row.scheduledAt.toISOString(),
			contentStatus: row.contentStatus,
			content: (row.content as CuratorReview | null) ?? null,
		})),
		verdict: checkpoint.verdict
			? { verdict: checkpoint.verdict, note: checkpoint.verdictNote }
			: null,
		character: characterFace(checkpoint.curatorCharacter),
		nextStage: next
			? {
					name: next.name ?? "",
					key: `workflow.${checkpoint.step?.projectWorkflow.title}.step${next.order + 1}.name`,
				}
			: null,
	};
};

const editUntil = (
	edit: PlanEdit,
	checkpoint: Parameters<typeof planCloses>[0] & {
		startedAt: Date;
		sessions: { index: number; scheduledAt: Date; endedAt: Date | null }[];
	},
) => {
	if (edit === "goalAndTasks") return planCloses(checkpoint);
	if (edit === "tasks") {
		return scopeWindow(
			checkpoint.startedAt,
			checkpoint.sessions,
			checkpoint.curatorKind,
		).closes;
	}
	return null;
};

export type AdviceRefusal =
	| "notFound"
	| "forbidden"
	| "planClosed"
	| "alreadyChecked"
	| "noTasks"
	| "failed";

/** What a sprint review reads, for the AI curator's review and the human curator's brief alike. */
export const reviewSelect = {
	id: true,
	projectId: true,
	goal: true,
	stageName: true,
	stepId: true,
	startedAt: true,
	dueAt: true,
	verdict: true,
	verdictNote: true,
	curatorCharacter: true,
	items: taskSelect,
	sessions: { select: { index: true, content: true } },
} as const;

export type ReviewCheckpoint = Prisma.ProjectCheckpointGetPayload<{
	select: typeof reviewSelect;
}>;
