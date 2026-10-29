import {
	CURATOR_ANSWER_DAYS,
	PAYMENT_WEBHOOK_GRACE_MINUTES,
} from "@/config/checkpoint";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import {
	awaitingCuratorOf,
	markPaymentCanceled,
	pendingCheckoutsBefore,
	returnToAuthor,
	staleStripeHolds,
} from "@/repositories/checkpoints/payment";
import {
	cancelUnpickedCheckpoints,
	reconcileCheckout,
} from "@/services/checkpoints/flows/payment";
import { notifyAuthorOfAnswer } from "@/services/checkpoints/notifications";
import { releaseCheckout } from "@/services/stripe/server";

const WEBHOOK_GRACE_MS = PAYMENT_WEBHOOK_GRACE_MINUTES * 60 * 1000;

/**
 * Checkouts still `PENDING` here after the webhook had its chance. Nobody may
 * open the checkpoint to trigger the check on read, and a hold nobody sees
 * runs out on the author's card.
 */
const reconcilePending = async () => {
	const pending = await pendingCheckoutsBefore(
		new Date(Date.now() - WEBHOOK_GRACE_MS),
	);

	let settled = 0;

	for (const payment of pending) {
		try {
			if (await reconcileCheckout(payment)) settled += 1;
		} catch (error) {
			console.error("[checkpoint-holds] reconcile failed", payment.id, error);
		}
	}

	return settled;
};

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
		const settled = await reconcilePending();

		const deadline = new Date();
		deadline.setUTCDate(deadline.getUTCDate() - CURATOR_ANSWER_DAYS);

		const stale = await staleStripeHolds(deadline);

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

			await markPaymentCanceled(payment.id);

			// Silence is an answer too: back to the author exactly as a decline
			// leaves it.
			const waiting = await awaitingCuratorOf(payment.payableId);

			if (!waiting) continue;

			if (!(await returnToAuthor(payment.payableId, waiting.curatorId)))
				continue;
			await notifyAuthorOfAnswer(
				payment.payableId,
				waiting.curator?.name ?? "",
				"silent",
			);

			released += 1;
		}

		const lapsed = await cancelUnpickedCheckpoints();

		return { settled, released, considered: stale.length, lapsed };
	});

	return json(result);
});
