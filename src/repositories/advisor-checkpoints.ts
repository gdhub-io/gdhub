import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";
import { checkpointSelect, withProgress } from "./checkpoint.repository";

/**
 * The advisor's own board, in the order the work reaches them.
 *
 * Four lists rather than one filtered table: what is asked of them differs by
 * group — an answer, then the running weeks, then nothing at all — and a single
 * list sorted by date would bury the one group that is waiting on them.
 *
 * The fourth is the ones they could not take. Declining clears `curatorId`, so
 * without it those checkpoints would vanish from the curator's own history the
 * moment they said no.
 *
 * The rows are the same shape the author's list uses, so both sides of a
 * checkpoint are drawn by the same cards.
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
		select: {
			...checkpointSelect,
			project: { select: { name: true, slug: true } },
		},
	});

	// Somebody else runs these now, or nobody does — either way they are this
	// curator's history. A checkpoint they declined and were later given again
	// belongs to the lists above, not here.
	const declined = await prisma.projectCheckpoint.findMany({
		where: {
			declinedCuratorIds: { has: curatorId },
			NOT: { curatorId },
		},
		orderBy: { updatedAt: "desc" },
		select: {
			...checkpointSelect,
			project: { select: { name: true, slug: true } },
		},
	});

	const of = (...statuses: CheckpointStatus[]) =>
		rows.filter((row) => statuses.includes(row.status)).map(withProgress);

	return {
		asked: of(CheckpointStatus.AwaitingCurator),
		running: of(CheckpointStatus.Active, CheckpointStatus.Review),
		closed: of(CheckpointStatus.Closed),
		declined: declined.map(withProgress),
	};
};

/**
 * One checkpoint, for the curator running it.
 *
 * The right to see it comes from being named on it — a curator is not a member
 * of the project — so this asks for the row by both ids at once rather than
 * checking access afterwards.
 */
export const getAdvisorCheckpoint = async (id: string, curatorId: string) => {
	const row = await prisma.projectCheckpoint.findFirst({
		where: { id, curatorId },
		select: {
			...checkpointSelect,
			project: { select: { name: true, slug: true } },
		},
	});

	return withProgress(row);
};
