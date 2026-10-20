import { PayableType, Prisma } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";
import type { CheckpointFeedbackDto } from "@/types/checkpoints";

/**
 * The author's rating of an assessment: given once, by whoever bought the
 * checkpoint — or, for one an admin gave away, the project's author — and
 * read only by administrators.
 */

export const FEEDBACK_SELECT = {
	rating: true,
	comment: true,
	createdAt: true,
} satisfies Prisma.CheckpointFeedbackSelect;

export const toDto = (row: {
	rating: number;
	comment: string | null;
	createdAt: Date;
}): CheckpointFeedbackDto => ({
	rating: row.rating,
	comment: row.comment,
	createdAt: row.createdAt.toISOString(),
});

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
			select: {
				verdict: true,
				project: { select: { authorId: true } },
				feedback: { select: FEEDBACK_SELECT },
			},
		}),
	]);
	if (!checkpoint) return null;

	return {
		raterId: payment ? payment.payerId : checkpoint.project.authorId,
		verdictSent: !!checkpoint.verdict,
		feedback: checkpoint.feedback,
	};
};

/** What the results modal shows the viewer; null for anyone but the rater. */
export const feedbackFor = async (checkpointId: string, viewerId: string) => {
	const rater = await raterOf(checkpointId);
	if (!rater?.verdictSent || rater.raterId !== viewerId) return null;

	return { feedback: rater.feedback && toDto(rater.feedback) };
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

	// Final once written: the unique checkpoint refuses a second one, and the first is returned.
	const row = await prisma.checkpointFeedback
		.create({
			data: {
				checkpointId,
				authorId: viewerId,
				rating,
				comment: comment?.trim() || null,
			},
			select: FEEDBACK_SELECT,
		})
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
			select: FEEDBACK_SELECT,
		});
		return {
			ok: false as const,
			error: "alreadyRated" as const,
			feedback: first && toDto(first),
		};
	}

	return { ok: true as const, feedback: toDto(row) };
};
