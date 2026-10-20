import { PayableType, Prisma } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";
import type { CheckpointFeedbackDto } from "@/types/checkpoints";

/**
 * The author's rating of an assessment: given once, by whoever bought the
 * checkpoint — or, for one an admin gave away, the project's author — and
 * read only by administrators.
 */

/** Who may rate: the payer of the checkpoint's latest payment, else the project's author. */
export const raterOf = async (checkpointId: string) => {
	const [payment, checkpoint] = await Promise.all([
		prisma.payment.findFirst({
			where: { payableType: PayableType.CHECKPOINT, payableId: checkpointId },
			orderBy: { createdAt: "desc" },
			select: { payerId: true },
		}),
		prisma.projectCheckpoint.findUnique({
			where: { id: checkpointId },
			select: { verdict: true, project: { select: { authorId: true } } },
		}),
	]);
	if (!checkpoint) return null;

	return {
		raterId: payment ? payment.payerId : checkpoint.project.authorId,
		verdictSent: !!checkpoint.verdict,
	};
};

const toDto = (row: {
	rating: number;
	comment: string | null;
	createdAt: Date;
}): CheckpointFeedbackDto => ({
	rating: row.rating,
	comment: row.comment,
	createdAt: row.createdAt.toISOString(),
});

/** What the results modal shows the viewer; null for anyone but the rater. */
export const feedbackFor = async (checkpointId: string, viewerId: string) => {
	const rater = await raterOf(checkpointId);
	if (!rater?.verdictSent || rater.raterId !== viewerId) return null;

	const row = await prisma.checkpointFeedback.findUnique({
		where: { checkpointId },
		select: { rating: true, comment: true, createdAt: true },
	});

	return { feedback: row && toDto(row) };
};

export const rateCheckpoint = async (
	checkpointId: string,
	viewerId: string,
	{ rating, comment }: { rating: number; comment?: string },
) => {
	const rater = await raterOf(checkpointId);
	if (!rater) return { ok: false as const, error: "notFound" as const };
	if (rater.raterId !== viewerId) {
		return { ok: false as const, error: "notRater" as const };
	}
	if (!rater.verdictSent) {
		return { ok: false as const, error: "noVerdict" as const };
	}

	// Final once written: a second send finds the first one and changes nothing.
	const existing = await prisma.checkpointFeedback.findUnique({
		where: { checkpointId },
		select: { rating: true, comment: true, createdAt: true },
	});
	if (existing) {
		return {
			ok: false as const,
			error: "alreadyRated" as const,
			feedback: toDto(existing),
		};
	}

	const row = await prisma.checkpointFeedback
		.create({
			data: {
				checkpointId,
				authorId: viewerId,
				rating,
				comment: comment?.trim() || null,
			},
			select: { rating: true, comment: true, createdAt: true },
		})
		// Another tab sent one a moment earlier: the unique checkpoint refuses this one.
		.catch((error) => {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				return null;
			}
			throw error;
		});
	if (!row) {
		const first = await prisma.checkpointFeedback.findUnique({
			where: { checkpointId },
			select: { rating: true, comment: true, createdAt: true },
		});
		return {
			ok: false as const,
			error: "alreadyRated" as const,
			feedback: first && toDto(first),
		};
	}

	return { ok: true as const, feedback: toDto(row) };
};
