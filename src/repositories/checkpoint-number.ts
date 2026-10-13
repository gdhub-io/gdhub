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

/** The checkpoint a project's `cpN` address names: the Nth that actually ran. */
export const checkpointIdByNumber = async (
	projectSlug: string,
	number: number,
) =>
	(
		await prisma.projectCheckpoint.findFirst({
			where: {
				project: { slug: projectSlug },
				status: {
					notIn: [CheckpointStatus.Draft, CheckpointStatus.Cancelled],
				},
			},
			orderBy: { createdAt: "asc" },
			skip: number - 1,
			select: { id: true },
		})
	)?.id ?? null;
