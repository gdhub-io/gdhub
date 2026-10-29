import { CHECKPOINT_MAX_ITEMS_PER_KIND } from "@/config/checkpoint";
import { CheckpointItemKind } from "@/config/prisma-enums";
import { planEdit } from "@/lib/checkpoints/call";
import { canEditPlan } from "@/repositories/checkpoints/viewer";
import type { PlanChange } from "@/schemas/checkpoint";
import { prisma } from "@/services/prisma";
export type PlanRefusal =
	| "notFound"
	| "forbidden"
	| "planClosed"
	| "goalLocked"
	| "taskDone"
	| "tooManyTasks";

const loadPlan = (checkpointId: string) =>
	prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			curatorId: true,
			curatorKind: true,
			startedAt: true,
			goalAgreedAt: true,
			planCheckedAt: true,
			scopeConfirmedAt: true,
			project: { select: { authorId: true } },
			sessions: {
				select: { index: true, scheduledAt: true, endedAt: true },
			},
			items: {
				where: { kind: CheckpointItemKind.Outcome },
				select: {
					id: true,
					order: true,
					text: true,
					originalText: true,
					_count: { select: { evidence: true } },
				},
			},
		},
	});

/**
 * One change to the plan, made on a call or, with the AI curator, on its
 * review page. Call 1 and the AI's first days write freely; call 3 keeps
 * the record — the first wording in `originalText`, a removed task cut rather
 * than deleted, an added one dated — and stamps `revisedAt` on its first change.
 */
export const changePlan = async (
	checkpointId: string,
	userId: string,
	change: PlanChange,
	now = new Date(),
): Promise<PlanRefusal | null> => {
	const checkpoint = await loadPlan(checkpointId);
	if (!checkpoint) return "notFound";
	if (!canEditPlan(checkpoint, userId)) return "forbidden";

	const edit = planEdit(checkpoint, now);
	if (!edit) return "planClosed";
	const revising = edit === "tasks";

	if (change.op === "goal") {
		if (edit !== "goalAndTasks") return "goalLocked";
		await prisma.projectCheckpoint.update({
			where: { id: checkpointId },
			data: { goal: change.goal },
		});
		return null;
	}

	if (change.op === "add") {
		if (checkpoint.items.length >= CHECKPOINT_MAX_ITEMS_PER_KIND) {
			return "tooManyTasks";
		}
		const order =
			checkpoint.items.reduce((max, item) => Math.max(max, item.order), 0) + 1;
		await prisma.$transaction([
			prisma.checkpointItem.create({
				data: {
					checkpointId,
					kind: CheckpointItemKind.Outcome,
					order,
					text: change.text,
					...(revising && { addedAt: now }),
				},
			}),
			...(revising ? [stampRevised(checkpointId, now)] : []),
		]);
		return null;
	}

	const item = checkpoint.items.find((row) => row.id === change.itemId);
	if (!item) return "notFound";
	// A task proven by an artifact is done: the plan keeps it as it was.
	if (revising && item._count.evidence > 0) return "taskDone";

	if (change.op === "edit") {
		await prisma.$transaction([
			prisma.checkpointItem.update({
				where: { id: item.id },
				data: {
					text: change.text,
					// Written once: a second rewording must not erase the first.
					...(revising &&
						item.originalText === null && { originalText: item.text }),
				},
			}),
			...(revising ? [stampRevised(checkpointId, now)] : []),
		]);
		return null;
	}

	if (!revising) {
		await prisma.checkpointItem.delete({ where: { id: item.id } });
		return null;
	}
	await prisma.$transaction([
		prisma.checkpointItem.update({
			where: { id: item.id },
			data: { cut: true },
		}),
		stampRevised(checkpointId, now),
	]);
	return null;
};

const stampRevised = (checkpointId: string, now: Date) =>
	prisma.projectCheckpoint.updateMany({
		where: { id: checkpointId, revisedAt: null },
		data: { revisedAt: now },
	});

/** Call 1 has ended: the goal is the one agreed with the curator. */
export const agreeGoal = async (checkpointId: string, now = new Date()) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: { curatorId: true },
	});
	if (!checkpoint) return;
	await prisma.projectCheckpoint.updateMany({
		where: { id: checkpointId, goalAgreedAt: null },
		data: { goalAgreedAt: now, goalAgreedById: checkpoint.curatorId },
	});
};

export type ApproveRefusal =
	| "notFound"
	| "forbidden"
	| "planClosed"
	| "notChecked"
	| "noTasks";

/** A plan the checkpoint can run on: at least one task left in it. */
export const HAS_TASKS = {
	items: { some: { kind: CheckpointItemKind.Outcome, cut: false } },
} as const;
