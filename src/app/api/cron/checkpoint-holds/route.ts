import {
	CheckpointStatus,
	PayableType,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import { releaseCheckout } from "@/services/stripe/server";

/** How long a curator has to answer before the money goes back. */
export const CURATOR_ANSWER_DAYS = 3;

/**
 * Lets go of the money held for checkpoints nobody answered for.
 *
 * Stripe cancels an uncaptured authorisation itself after seven days, and an
 * authorisation that dies of old age reads to the author as the platform losing
 * their purchase. Three days is ours: it releases while the hold is still
 * healthy, and the checkpoint goes back to being a draft its author can hand to
 * somebody else.
 *
 * Nothing is refunded here because nothing was charged — that is the whole point
 * of holding rather than taking.
 */
export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("checkpoint-holds", async () => {
		const deadline = new Date();
		deadline.setUTCDate(deadline.getUTCDate() - CURATOR_ANSWER_DAYS);

		const stale = await prisma.payment.findMany({
			where: {
				payableType: PayableType.CHECKPOINT,
				status: PaymentStatus.PROCESSING,
				createdAt: { lt: deadline },
			},
			select: { id: true, payableId: true, providerTransactionId: true },
		});

		let released = 0;

		for (const payment of stale) {
			if (!payment.providerTransactionId) continue;

			try {
				await releaseCheckout(payment.providerTransactionId);
			} catch (error) {
				// One hold Stripe will not let go of must not stop the others: the
				// rest are still counting down towards its own seven-day limit.
				console.error("[checkpoint-holds] release failed", payment.id, error);
				continue;
			}

			await prisma.payment.update({
				where: { id: payment.id },
				data: { status: PaymentStatus.CANCELED },
			});

			// Back to the author, with the curator cleared: the same place a
			// decline leaves it, so there is one way out and not two.
			// Silence is an answer too: the expert who never replied is marked
			// unavailable like one who said so, and for the same reason.
			const waiting = await prisma.projectCheckpoint.findFirst({
				where: {
					id: payment.payableId,
					status: CheckpointStatus.AwaitingCurator,
				},
				select: { curatorId: true },
			});

			if (!waiting) continue;

			await prisma.projectCheckpoint.update({
				where: { id: payment.payableId },
				data: {
					status: CheckpointStatus.Draft,
					curatorId: null,
					curatorDeclinedAt: new Date(),
					paymentId: null,
					...(waiting.curatorId && {
						declinedCuratorIds: { push: waiting.curatorId },
					}),
				},
			});

			released += 1;
		}

		return { released, considered: stale.length };
	});

	return json(result);
});
