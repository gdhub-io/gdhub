import {
	type CheckpointCuratorKind,
	CheckpointStatus,
} from "@/config/prisma-enums";
import { currentSprint } from "@/lib/checkpoint-sprints";
import { prisma } from "@/services/prisma";
import type { PreviousVerdict } from "@/types/checkpoints";

const UNNUMBERED = [CheckpointStatus.Draft, CheckpointStatus.Cancelled];

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
			status: { notIn: UNNUMBERED },
		},
	})) + 1;

/**
 * `checkpointNumber` and the curator kind of the checkpoint before this one that
 * ran (null for the project's first), from one query.
 */
export const checkpointLineage = async (row: {
	projectId: string;
	createdAt: Date;
}): Promise<{
	number: number;
	previousCuratorKind: CheckpointCuratorKind | null;
}> => {
	const before = await prisma.projectCheckpoint.findMany({
		where: {
			projectId: row.projectId,
			createdAt: { lt: row.createdAt },
			status: { notIn: UNNUMBERED },
		},
		orderBy: { createdAt: "desc" },
		select: { curatorKind: true },
	});
	return {
		number: before.length + 1,
		previousCuratorKind: before[0]?.curatorKind ?? null,
	};
};

/** `checkpointNumber` for many rows in one query, keyed by id. */
export const checkpointNumbers = async (
	rows: { id: string; projectId: string; createdAt: Date }[],
): Promise<Map<string, number>> => {
	if (!rows.length) return new Map();
	const counted = await prisma.projectCheckpoint.findMany({
		where: {
			projectId: { in: [...new Set(rows.map((row) => row.projectId))] },
			status: { notIn: UNNUMBERED },
		},
		select: { projectId: true, createdAt: true },
	});

	return new Map(
		rows.map((row) => [
			row.id,
			counted.filter(
				(one) =>
					one.projectId === row.projectId && one.createdAt < row.createdAt,
			).length + 1,
		]),
	);
};

/** The checkpoint a project's `cpN` address names: the Nth that actually ran. */
export const checkpointIdByNumber = async (
	projectSlug: string,
	number: number,
) =>
	(
		await prisma.projectCheckpoint.findFirst({
			where: {
				project: { slug: projectSlug },
				status: { notIn: UNNUMBERED },
			},
			orderBy: { createdAt: "asc" },
			skip: number - 1,
			select: { id: true },
		})
	)?.id ?? null;

/**
 * The verdict of the checkpoint before this one, while this one is in its
 * first sprint — where it is the starting position. Null after that, or when
 * there was none.
 */
export const previousVerdict = async (
	checkpoint: { projectId: string; createdAt: Date; startedAt: Date | null },
	now = new Date(),
): Promise<PreviousVerdict | null> => {
	if (!checkpoint.startedAt || currentSprint(checkpoint.startedAt, now) > 1) {
		return null;
	}
	const previous = await prisma.projectCheckpoint.findFirst({
		where: {
			projectId: checkpoint.projectId,
			createdAt: { lt: checkpoint.createdAt },
			status: CheckpointStatus.Closed,
			verdict: { not: null },
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			projectId: true,
			createdAt: true,
			verdict: true,
			verdictNote: true,
		},
	});
	if (!previous?.verdict) return null;
	return {
		checkpointId: previous.id,
		number: await checkpointNumber(previous),
		verdict: previous.verdict,
		note: previous.verdictNote,
	};
};
