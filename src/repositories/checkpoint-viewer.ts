import type { Prisma } from "@gdhub-io/gdhub-prisma";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { prisma } from "@/services/prisma";

/**
 * Who a checkpoint is to the person reading it. The curator has no seat in the
 * project, so the project's space cannot answer this: the checkpoint does.
 */
export type CheckpointViewer = "curator" | "author" | "team";

/** What `viewerOf` reads, for a checkpoint query already under way. */
export const viewerSelect = (userId: string) =>
	({
		curatorId: true,
		project: {
			select: {
				authorId: true,
				team: {
					select: {
						members: {
							where: { ...CONFIRMED_MEMBERS, userId },
							select: { id: true },
						},
					},
				},
			},
		},
	}) satisfies Prisma.ProjectCheckpointSelect;

type ViewerRow = {
	curatorId: string | null;
	project: {
		authorId: string;
		team: { members: unknown[] } | null;
	};
};

export const viewerOf = (
	row: ViewerRow,
	userId: string,
): CheckpointViewer | null => {
	if (row.curatorId === userId) return "curator";
	if (row.project.authorId === userId) return "author";
	return row.project.team?.members.length ? "team" : null;
};

export const checkpointViewer = async (
	checkpointId: string,
	userId: string,
) => {
	const row = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: viewerSelect(userId),
	});
	return row ? viewerOf(row, userId) : null;
};

/** The plan's editors: its curator and the project's author, nobody else on the team. */
export const canEditPlan = (
	row: { curatorId: string | null; project: { authorId: string } },
	userId: string,
) => row.curatorId === userId || row.project.authorId === userId;
