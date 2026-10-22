import {
	CheckpointStatus,
	type PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
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

/**
 * A refund the provider reports, ours or one made in its dashboard. Keyed by the
 * provider's id, so the row our own refund wrote is kept and never doubled.
 * Money back in full on a checkpoint that never started closes it; one already
 * running is left to an administrator.
 */
export const recordProviderRefund = async (
	payment: { id: string; payableId: string },
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

	if (!whole) return;

	await prisma.projectCheckpoint.updateMany({
		where: {
			id: payment.payableId,
			status: {
				in: [CheckpointStatus.Draft, CheckpointStatus.AwaitingCurator],
			},
		},
		data: { status: CheckpointStatus.Cancelled },
	});
};
