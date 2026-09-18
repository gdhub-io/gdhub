import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { checkpointDay } from "@/lib/checkpoint-days";
import { prisma } from "@/services/prisma";

const curatorCheckpointSelect = {
	id: true,
	order: true,
	stageName: true,
	status: true,
	goal: true,
	startedAt: true,
	dueAt: true,
	verdict: true,
	decidedAt: true,
	project: { select: { name: true, slug: true, coverImage: true } },
} as const;

export type AdvisorCheckpoint = {
	id: string;
	order: number;
	stageName: string;
	status: CheckpointStatus;
	goal: string;
	startedAt: string | null;
	dueAt: string | null;
	verdict: string | null;
	project: { name: string; slug: string; coverImage: string | null };
	/** Null until the 28 days are running — see `checkpointDay`. */
	day: number | null;
};

/**
 * The advisor's own board, in the order the work reaches them.
 *
 * Three lists rather than one filtered table: what is asked of them differs by
 * group — an answer, then the running weeks, then nothing at all — and a single
 * list sorted by date would bury the one group that is waiting on them.
 *
 * Scoped by `curatorId`: a curator sees the checkpoints handed to them and no
 * others, whatever project those belong to.
 */
export const listAdvisorCheckpoints = async (curatorId: string) => {
	const rows = await prisma.projectCheckpoint.findMany({
		where: {
			curatorId,
			status: {
				in: [
					CheckpointStatus.AwaitingCurator,
					CheckpointStatus.Active,
					CheckpointStatus.Review,
					CheckpointStatus.Closed,
				],
			},
		},
		orderBy: { createdAt: "desc" },
		select: curatorCheckpointSelect,
	});

	const shape = (row: (typeof rows)[number]): AdvisorCheckpoint => ({
		...row,
		startedAt: row.startedAt?.toISOString() ?? null,
		dueAt: row.dueAt?.toISOString() ?? null,
		day:
			row.startedAt && row.status !== CheckpointStatus.AwaitingCurator
				? checkpointDay(row.startedAt)
				: null,
	});

	return {
		asked: rows
			.filter((row) => row.status === CheckpointStatus.AwaitingCurator)
			.map(shape),
		running: rows
			.filter(
				(row) =>
					row.status === CheckpointStatus.Active ||
					row.status === CheckpointStatus.Review,
			)
			.map(shape),
		closed: rows
			.filter((row) => row.status === CheckpointStatus.Closed)
			.map(shape),
	};
};
