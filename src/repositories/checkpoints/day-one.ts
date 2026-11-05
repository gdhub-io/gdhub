import { prisma } from "@/services/prisma";

/**
 * The window of devlogs day one reads (GDHUB-156): at the project's first
 * checkpoint everything before its start, at a later one everything since the
 * previous checkpoint started.
 */
export const dayOneWindow = (end: Date, previousStart: Date | null) => ({
	lt: end,
	...(previousStart && { gte: previousStart }),
});

/** Which devlogs come before a checkpoint; a draft reads up to now. */
export const dayOneDevlogsWhere = async (checkpoint: {
	id: string;
	projectId: string;
	startedAt: Date | null;
}) => {
	const end = checkpoint.startedAt ?? new Date();
	const previous = await prisma.projectCheckpoint.findFirst({
		where: {
			projectId: checkpoint.projectId,
			id: { not: checkpoint.id },
			startedAt: { not: null, lt: end },
		},
		orderBy: { startedAt: "desc" },
		select: { startedAt: true },
	});
	return {
		projectId: checkpoint.projectId,
		isSystem: false,
		publishedAt: dayOneWindow(end, previous?.startedAt ?? null),
	};
};

/** The devlogs before a checkpoint, oldest first, as day one reads and looks at them. */
export const dayOneDevlogs = async (checkpoint: {
	id: string;
	projectId: string;
	startedAt: Date | null;
}) =>
	prisma.projectReport.findMany({
		where: await dayOneDevlogsWhere(checkpoint),
		orderBy: { publishedAt: "asc" },
		select: {
			id: true,
			content: true,
			video: true,
			contentEditor: true,
			publishedAt: true,
		},
	});

export type DayOneDevlog = Awaited<ReturnType<typeof dayOneDevlogs>>[number];
