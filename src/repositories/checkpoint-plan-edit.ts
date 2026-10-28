import {
	AI_APPROVE_HOURS,
	CHECKPOINT_MAX_ITEMS_PER_KIND,
	SCOPE_SESSION,
} from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
} from "@/config/prisma-enums";
import { planEdit } from "@/lib/checkpoint-call";
import { MS_PER_HOUR } from "@/lib/checkpoint-days";
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
			project: { select: { authorId: true } },
			sessions: {
				select: {
					index: true,
					scheduledAt: true,
					endedAt: true,
					content: true,
				},
			},
			items: {
				where: { kind: CheckpointItemKind.Outcome },
				select: {
					id: true,
					order: true,
					text: true,
					originalText: true,
					artifactId: true,
				},
			},
		},
	});

/** The plan's editors: its curator and the project's author, nobody else on the team. */
export const canEditPlan = (
	checkpoint: { curatorId: string | null; project: { authorId: string } },
	userId: string,
) => checkpoint.curatorId === userId || checkpoint.project.authorId === userId;

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
	if (revising && item.artifactId) return "taskDone";

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
const HAS_TASKS = {
	items: { some: { kind: CheckpointItemKind.Outcome, cut: false } },
} as const;

/** Session 1 once the AI curator has checked the tasks. */
const CHECKED = { path: ["step"], equals: "checked" };

/**
 * The author is done with the plan, with the AI curator: on day 1 after the
 * one check, which locks the goal and tasks until day 15; on day 15 after
 * the sprint 2 review's advice, which locks the tasks for the rest of it.
 */
export const approvePlan = async (
	checkpointId: string,
	userId: string,
	now = new Date(),
): Promise<ApproveRefusal | null> => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			curatorId: true,
			curatorKind: true,
			startedAt: true,
			goalAgreedAt: true,
			project: { select: { authorId: true } },
			sessions: {
				select: {
					id: true,
					index: true,
					scheduledAt: true,
					endedAt: true,
					content: true,
				},
			},
			items: {
				where: HAS_TASKS.items.some,
				select: { id: true },
			},
		},
	});
	if (!checkpoint) return "notFound";
	if (!canEditPlan(checkpoint, userId)) return "forbidden";
	if (checkpoint.curatorKind !== CheckpointCuratorKind.AI) return "planClosed";
	const edit = planEdit(checkpoint, now);
	const sessionOf = (index: number) =>
		checkpoint.sessions.find((session) => session.index === index);

	if (edit === "tasks") {
		const scope = sessionOf(SCOPE_SESSION);
		if (!scope) return "planClosed";
		await prisma.checkpointSession.update({
			where: { id: scope.id },
			data: {
				content: { ...(scope.content as object | null), approved: true },
			},
		});
		return null;
	}
	if (edit !== "goalAndTasks") return "planClosed";
	const content = sessionOf(1)?.content as { step?: string } | null;
	if (content?.step !== "checked") return "notChecked";
	if (!checkpoint.items.length) return "noTasks";

	await prisma.projectCheckpoint.updateMany({
		where: { id: checkpointId, goalAgreedAt: null },
		data: { goalAgreedAt: now, goalAgreedById: userId },
	});
	return null;
};

/**
 * The hourly run: a checked plan nobody approved approves itself
 * AI_APPROVE_HOURS after the check, as it stands — never an empty one.
 */
export const approveCheckedPlans = async (now = new Date()) => {
	const due = await prisma.projectCheckpoint.findMany({
		where: {
			curatorKind: CheckpointCuratorKind.AI,
			status: CheckpointStatus.Active,
			goalAgreedAt: null,
			...HAS_TASKS,
			sessions: {
				some: {
					index: 1,
					content: CHECKED,
					updatedAt: {
						lte: new Date(now.getTime() - AI_APPROVE_HOURS * MS_PER_HOUR),
					},
				},
			},
		},
		select: { id: true },
	});
	for (const { id } of due) {
		const { count } = await prisma.projectCheckpoint.updateMany({
			where: { id, goalAgreedAt: null },
			data: { goalAgreedAt: now },
		});
		if (!count) continue;
		const { notifyPlanApproved } = await import(
			"@/services/checkpoint-notifications"
		);
		await notifyPlanApproved(id);
	}
	return due.length;
};
