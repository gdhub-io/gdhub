import { CheckpointStatus } from "@/config/prisma-enums";
import { prisma } from "@/services/prisma";

/**
 * The checkpoint's number through the whole project: the ones before it that
 * actually ran, plus one. Drafts and cancelled ones never took a number.
 */
export const checkpointNumber = async (row: {
	projectId: string;
	createdAt: Date;
}) =>
	(await prisma.projectCheckpoint.count({
		where: {
			projectId: row.projectId,
			createdAt: { lt: row.createdAt },
			status: {
				notIn: [CheckpointStatus.Draft, CheckpointStatus.Cancelled],
			},
		},
	})) + 1;
