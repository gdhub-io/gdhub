import { AI_APPROVE_HOURS } from "@/config/checkpoint";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import { planChecked, planEdit } from "@/lib/checkpoints/call";
import { MS_PER_HOUR } from "@/lib/checkpoints/days";
import {
	type ApproveRefusal,
	HAS_TASKS,
} from "@/repositories/checkpoints/plan-edit";
import { canEditPlan } from "@/repositories/checkpoints/viewer";
import { prisma } from "@/services/prisma";

/**
 * The author is done with the plan, with the AI curator: on day 1 after the
 * one check, which locks the goal and tasks until day 15; on day 15 after
 * the check of the changes sent, which locks the tasks for the rest of it.
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
			planCheckedAt: true,
			scopeConfirmedAt: true,
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
				where: HAS_TASKS.items.some,
				select: { id: true },
			},
		},
	});
	if (!checkpoint) return "notFound";
	if (!canEditPlan(checkpoint, userId)) return "forbidden";
	if (checkpoint.curatorKind !== CheckpointCuratorKind.AI) return "planClosed";
	const edit = planEdit(checkpoint, now);

	if (edit === "tasks") {
		// Day 15 confirms only what the curator has checked (GDHUB-125).
		if (!planChecked(checkpoint, edit)) return "notChecked";
		await prisma.projectCheckpoint.updateMany({
			where: { id: checkpointId, scopeConfirmedAt: null },
			data: { scopeConfirmedAt: now },
		});
		return null;
	}
	if (edit !== "goalAndTasks") return "planClosed";
	if (!checkpoint.planCheckedAt) return "notChecked";
	if (!checkpoint.items.length) return "noTasks";

	const { count } = await prisma.projectCheckpoint.updateMany({
		where: { id: checkpointId, goalAgreedAt: null },
		data: { goalAgreedAt: now, goalAgreedById: userId },
	});
	// The page reads the plan's letter as soon as it reloads.
	if (count) await writePlanLetterOf(checkpointId);
	return null;
};

const writePlanLetterOf = async (checkpointId: string) =>
	(await import("@/services/checkpoints/flows/ai-curator")).writePlanLetter(
		checkpointId,
	);

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
			planCheckedAt: {
				lte: new Date(now.getTime() - AI_APPROVE_HOURS * MS_PER_HOUR),
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
			"@/services/checkpoints/notifications"
		);
		await notifyPlanApproved(id);
		await writePlanLetterOf(id);
	}
	return due.length;
};
