import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import { toDevlog } from "@/repositories/checkpoints/ai-curator";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import { viewerOf, viewerSelect } from "@/repositories/checkpoints/viewer";
import { prisma } from "@/services/prisma";

/**
 * What the verdict share card shows (GDHUB-144), for one of the project's own
 * team. Null for anyone else, and for a checkpoint that is not a closed AI
 * one: a human curator's verdict is theirs to share.
 */
export const getShareSource = async (checkpointId: string, userId: string) => {
	const viewer = viewerSelect(userId);
	const row = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			curatorId: true,
			projectId: true,
			createdAt: true,
			status: true,
			curatorKind: true,
			curatorCharacter: true,
			stageName: true,
			verdict: true,
			shareLine: true,
			decidedAt: true,
			project: {
				select: {
					...viewer.project.select,
					name: true,
					slug: true,
					coverImage: true,
				},
			},
		},
	});
	if (!row) return null;
	const seat = viewerOf(row, userId);
	if (seat !== "author" && seat !== "team") return null;
	if (
		row.curatorKind !== CheckpointCuratorKind.AI ||
		row.status !== CheckpointStatus.Closed ||
		!row.verdict
	)
		return null;

	return {
		id: checkpointId,
		number: await checkpointNumber(row),
		character: row.curatorCharacter,
		stage: row.stageName,
		verdict: row.verdict,
		shareLine: row.shareLine,
		decidedAt: row.decidedAt,
		project: {
			name: row.project.name,
			slug: row.project.slug,
			cover: row.project.coverImage,
		},
	};
};

export type ShareSource = NonNullable<
	Awaited<ReturnType<typeof getShareSource>>
>;

/** What the curator reads to write the line, once: the goal, its note, the pitch and the devlogs. */
export const getShareLineContext = async (checkpointId: string) => {
	const row = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: {
			goal: true,
			verdictNote: true,
			project: { select: { description: true } },
			reports: {
				orderBy: { publishedAt: "asc" },
				select: { publishedAt: true, content: true, contentEditor: true },
			},
		},
	});
	return {
		goal: row.goal,
		verdictNote: row.verdictNote,
		pitch: row.project.description,
		devlogs: row.reports.map((post) => toDevlog(post).content),
	};
};

/** Keeps the first line written; a request that lost the race reads the winner's back. */
export const keepShareLine = async (checkpointId: string, line: string) => {
	const { count } = await prisma.projectCheckpoint.updateMany({
		where: { id: checkpointId, shareLine: null },
		data: { shareLine: line },
	});
	if (count) return line;
	const { shareLine } = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: { shareLine: true },
	});
	return shareLine ?? line;
};
