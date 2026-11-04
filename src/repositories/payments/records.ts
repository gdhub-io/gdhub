import {
	CheckpointStatus,
	type PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import {
	CHECKPOINT_PENDING_STATUSES,
	checkpointMove,
} from "@/lib/checkpoints/status";
import { prisma } from "@/services/prisma";

/**
 * What a provider's webhook may read and write, kept to that provider: a row
 * another provider took is never found, so Stripe and Paddle cannot settle or
 * refund each other's payments.
 */
export const paymentOf = async (
	provider: PaymentProvider,
	where: { id: string } | { providerTransactionId: string },
) => {
	const payment = await prisma.payment.findUnique({ where });

	return payment?.provider === provider ? payment : null;
};

/**
 * Writes the delivery under its own id. False for one already seen: providers
 * retry, and a duplicate must stop before any side effect runs.
 */
export const recordPaymentEvent = async (
	provider: PaymentProvider,
	event: { id: string; type: string; payload: unknown },
	paymentId: string | null,
) => {
	try {
		await prisma.paymentEvent.create({
			data: {
				provider,
				eventId: event.id,
				type: event.type,
				payload: event.payload as object,
				paymentId,
			},
		});

		return true;
	} catch (error) {
		if ((error as { code?: string }).code === "P2002") return false;
		throw error;
	}
};

/** Removes a delivery `recordPaymentEvent` wrote, so the provider's retry runs its work again. */
export const forgetPaymentEvent = (
	provider: PaymentProvider,
	eventId: string,
) => prisma.paymentEvent.deleteMany({ where: { provider, eventId } });

/**
 * Runs a delivery's work once. A duplicate is skipped; work that throws forgets
 * this delivery's own row, so the provider's retry is not read as a duplicate.
 * Returns false for a duplicate.
 */
export const oncePerEvent = async (
	provider: PaymentProvider,
	event: { id: string; type: string; payload: unknown },
	paymentId: string | null,
	work: () => Promise<unknown>,
) => {
	if (!(await recordPaymentEvent(provider, event, paymentId))) return false;
	try {
		await work();
	} catch (error) {
		await forgetPaymentEvent(provider, event.id);
		throw error;
	}
	return true;
};

/** The provider's refund row, keyed by its id so our own refund's row is kept and never doubled, and the payment's status. */
export const writeProviderRefund = async (
	payment: { id: string },
	refund: {
		id: string;
		amount: number;
		currency: string;
		reason: string;
	} | null,
	whole: boolean,
) => {
	if (refund) {
		await prisma.refund.upsert({
			where: { providerRefundId: refund.id },
			create: {
				paymentId: payment.id,
				amount: refund.amount,
				currency: refund.currency.toUpperCase(),
				reason: refund.reason,
				providerRefundId: refund.id,
			},
			update: {},
		});
	}

	await prisma.payment.update({
		where: { id: payment.id },
		data: {
			status: whole ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
		},
	});
};

/**
 * A checkpoint refund the provider reports, ours or one made in its dashboard.
 * Money back in full on a checkpoint that never started closes it; one already
 * running is left to an administrator.
 */
export const recordProviderRefund = async (
	payment: { id: string; payableId: string },
	refund: Parameters<typeof writeProviderRefund>[1],
	whole: boolean,
) => {
	await writeProviderRefund(payment, refund, whole);
	if (!whole) return;

	const move = checkpointMove(
		CHECKPOINT_PENDING_STATUSES,
		CheckpointStatus.Cancelled,
	);
	await prisma.projectCheckpoint.updateMany({
		where: { id: payment.payableId, ...move.where },
		data: move.data,
	});
};
