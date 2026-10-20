import { CHECKPOINT_RUNNING_STATUSES } from "@/config/checkpoint";
import { checkpointNumber } from "@/repositories/checkpoint-number";
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
