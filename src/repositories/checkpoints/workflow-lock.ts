import { CheckpointVerdict } from "@/config/prisma-enums";
import { CHECKPOINT_RUNNING_STATUSES } from "@/lib/checkpoints/status";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { prisma } from "@/services/prisma";

/**
 * The checkpoint running on a project, as the admin workflow tools name it when
 * they refuse to pull its stage away — dialog `rhKOo`. Null when nothing runs.
 */
export const runningCheckpointLock = async (projectId: string) => {
	const running = await prisma.projectCheckpoint.findFirst({
		where: { projectId, status: { in: CHECKPOINT_RUNNING_STATUSES } },
		select: { projectId: true, createdAt: true, stageName: true, dueAt: true },
	});
	if (!running) return null;

	return {
		number: await checkpointNumber(running),
		stageName: running.stageName,
		dueAt: running.dueAt?.toISOString() ?? null,
	};
};

/**
 * Leaving a stage (Dmitry, 2026-10-26): its required tasks done, and — once a
 * checkpoint has run on it — a verdict that approved the move. A stage worked
 * without checkpoints moves on its tasks alone.
 */
export const stageMoveApproved = async (projectId: string, stepId: string) => {
	const verdicts = await prisma.projectCheckpoint.findMany({
		where: { projectId, stepId, verdict: { not: null } },
		select: { verdict: true },
	});
	return (
		!verdicts.length ||
		verdicts.some((row) => row.verdict === CheckpointVerdict.StageClosed)
	);
};
