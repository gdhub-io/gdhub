import {
	CheckpointCuratorKind,
	CheckpointStatus,
	type PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { SESSIONS_PER_CHECKPOINT } from "@/config/checkpoint";
import { dueDateFrom, sessionDay, utcStartOfDay } from "@/lib/checkpoints/days";
import { dateOfDay } from "@/lib/checkpoints/plan";
import type { RefundRowReason } from "@/lib/checkpoints/refund";
import { checkpointMove } from "@/lib/checkpoints/status";
import {
	bookSessions,
	SlotTakenError,
} from "@/repositories/advisor-availability";
import {
	afterResponse,
	heldPaymentWhere,
	type PendingCheckout,
} from "@/repositories/checkpoints/payment";
import { notifyCuratorAsked } from "@/services/checkpoints/notifications";
import { type CheckoutPaid, gatewayFor } from "@/services/payments/gateway";
import { prisma } from "@/services/prisma";

/**
 * Gives the author their money back, whichever way it is still sitting.
 *
 * A hold is released and costs nothing; a payment that was already captured is
 * refunded, fee and all. Both are asked of the provider first and written down
 * only once it agrees — a row claiming money went back when it did not is worse than
 * no row at all.
 *
 * Returns what happened, `failed` when the provider refused, or null when there was
 * nothing to give back.
 */
export const returnCheckpointMoney = async (
	checkpointId: string,
	reason: Extract<RefundRowReason, "checkpointCancelled" | "curatorDeclined">,
) => {
	const payment = await prisma.payment.findFirst({
		where: heldPaymentWhere(checkpointId),
		select: {
			id: true,
			amount: true,
			currency: true,
			status: true,
			provider: true,
			providerTransactionId: true,
		},
	});

	if (!payment?.providerTransactionId) return null;

	const gateway = gatewayFor(payment.provider);

	if (payment.status === PaymentStatus.PROCESSING && gateway.release) {
		const released = await gateway.release(payment.providerTransactionId);

		if (!released) return { failed: "holdNotReleased" as const };

		await prisma.payment.update({
			where: { id: payment.id },
			data: { status: PaymentStatus.CANCELED },
		});

		return { released: true as const };
	}

	const refund = await gateway.refund(payment.providerTransactionId);

	if (!refund) return { failed: "refundFailed" as const };

	await prisma.$transaction([
		prisma.refund.create({
			data: {
				paymentId: payment.id,
				amount: refund.amount,
				currency: refund.currency,
				reason,
				providerRefundId: refund.id,
			},
		}),
		prisma.payment.update({
			where: { id: payment.id },
			data: { status: PaymentStatus.REFUNDED },
		}),
	]);

	return { refunded: true as const };
};

/**
 * A completed checkout, applied: the payment becomes a hold and the checkpoint
 * goes to its curator, or starts at once with the AI one. Paddle charges at once,
 * so its payment is complete here; a Stripe hold for the AI curator is captured.
 *
 * The webhook and the reconciliation both land here, possibly for the same
 * purchase. Only a `PENDING` row moves, so whichever comes second finds nothing
 * to do — and a confirmation arriving late cannot turn a captured or released
 * payment back into a hold.
 *
 * Returns whether this call was the one that applied it.
 */
export const settleCheckpointCheckout = async (
	payment: { id: string; payableId: string; provider: PaymentProvider },
	paid: CheckoutPaid,
) => {
	const gateway = gatewayFor(payment.provider);
	const { count } = await prisma.payment.updateMany({
		where: { id: payment.id, status: PaymentStatus.PENDING },
		data: {
			status: PaymentStatus.PROCESSING,
			providerTransactionId: paid.transactionId,
			providerCustomerId: paid.customerId,
			...(paid.invoiceId && { providerInvoiceId: paid.invoiceId }),
			// What was actually charged, after any promotion code.
			...(paid.amount != null && { amount: paid.amount }),
		},
	});

	if (!count) return false;

	// A 100% code made in the dashboard leaves nothing to hold or capture, and a
	// free checkpoint is an admin's call (GDHUB-40), so it reads as a failed payment.
	if (!paid.charged) {
		await prisma.payment.update({
			where: { id: payment.id },
			data: { status: PaymentStatus.CANCELED },
		});

		return true;
	}

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: payment.payableId },
		select: { status: true, curatorKind: true },
	});

	// A checkpoint deleted in the meantime keeps its hold as PROCESSING, and the
	// holds cron lets it go like any other nobody answered for.
	if (checkpoint?.status !== CheckpointStatus.Draft) return true;

	// Nobody has to say yes to the AI curator, so the hold is taken at once —
	// left as a hold, the holds cron would let it go and the 28 days would run
	// unpaid. A capture Stripe refuses starts nothing: the hold is let go and the
	// draft reads as a failed payment the author can retry.
	if (checkpoint.curatorKind === CheckpointCuratorKind.AI) {
		const captured =
			!paid.held ||
			(await gateway.capture?.(paid.transactionId).catch(() => null));

		if (!captured) {
			// Written only once Stripe agrees; a hold it would not release stays
			// PROCESSING for the holds cron to try again.
			if (await gateway.release?.(paid.transactionId).catch(() => null)) {
				await prisma.payment.update({
					where: { id: payment.id },
					data: { status: PaymentStatus.CANCELED },
				});
			}

			return true;
		}

		await prisma.payment.update({
			where: { id: payment.id },
			data: { status: PaymentStatus.COMPLETED, completedAt: new Date() },
		});
	}

	if (checkpoint.curatorKind === CheckpointCuratorKind.AI) {
		if (!(await startAiCheckpoint(payment.payableId, payment.id))) {
			console.error(
				`[checkpoint] ${payment.payableId} paid but left Draft meanwhile`,
			);
		}
		return true;
	}

	// The five calls are booked with the money, so the curator's hours are held
	// while they decide. Someone else may have taken the hour since the author
	// picked it: then the hold is let go and the draft asks for another time.
	try {
		const asked = await prisma.$transaction(async (tx) => {
			const move = checkpointMove(
				CheckpointStatus.Draft,
				CheckpointStatus.AwaitingCurator,
			);
			const { count } = await tx.projectCheckpoint.updateMany({
				where: { id: payment.payableId, ...move.where },
				data: { ...move.data, paymentId: payment.id },
			});
			if (count) await bookSessions(tx, payment.payableId);
			return count > 0;
		});
		if (asked) await notifyCuratorAsked(payment.payableId);
	} catch (error) {
		if (!(error instanceof SlotTakenError)) throw error;

		if (await gateway.release?.(paid.transactionId).catch(() => null)) {
			await prisma.payment.update({
				where: { id: payment.id },
				data: { status: PaymentStatus.CANCELED },
			});
		}
		await prisma.projectCheckpoint.update({
			where: { id: payment.payableId },
			data: { startedAt: null, dueAt: null },
		});
	}

	return true;
};

/**
 * Asks the provider what became of a checkout still `PENDING` here, and applies
 * the answer. A webhook that never arrived — not forwarded, misconfigured, failed
 * past its retries — would otherwise leave money held on a card for a
 * checkpoint that still reads as unpaid.
 */
export const reconcileCheckout = async (payment: PendingCheckout) => {
	if (!payment.providerTransactionId) return false;

	const checkout = await gatewayFor(payment.provider).checkoutState(
		payment.providerTransactionId,
	);

	if (checkout.state === "paid") {
		return settleCheckpointCheckout(payment, checkout);
	}

	if (checkout.state === "expired") {
		await prisma.payment.updateMany({
			where: { id: payment.id, status: PaymentStatus.PENDING },
			data: { status: PaymentStatus.CANCELED },
		});
	}

	return false;
};

/**
 * The AI curator starts on payment. The day picked may have passed while the
 * draft waited to be paid, so it starts today at the earliest; the plan waits
 * for the author's tasks and approval; and its five review days are written
 * like a person's calls. Then the curator takes its character and reads the
 * goal. Returns false when it had already started or been called off.
 */
export const startAiCheckpoint = async (
	checkpointId: string,
	/** Null when an administrator gives it for free. */
	paymentId: string | null,
	now = new Date(),
) => {
	const checkpoint = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: { startedAt: true },
	});
	const today = utcStartOfDay(now);
	const picked = checkpoint.startedAt && utcStartOfDay(checkpoint.startedAt);
	const startedAt = picked && picked > today ? picked : today;

	const started = await prisma.$transaction(async (tx) => {
		// A draft being paid for, or one handed from a person to the AI while it waited.
		const move = checkpointMove(
			[CheckpointStatus.Draft, CheckpointStatus.AwaitingCurator],
			CheckpointStatus.Active,
		);
		const { count } = await tx.projectCheckpoint.updateMany({
			where: { id: checkpointId, ...move.where },
			data: {
				...move.data,
				paymentId,
				startedAt,
				dueAt: dueDateFrom(startedAt),
				goalAgreedAt: null,
				goalAgreedById: null,
			},
		});
		if (!count) return false;

		await tx.checkpointSession.deleteMany({ where: { checkpointId } });
		await tx.checkpointSession.createMany({
			data: Array.from({ length: SESSIONS_PER_CHECKPOINT }, (_, offset) => ({
				checkpointId,
				index: offset + 1,
				scheduledAt: dateOfDay(startedAt, sessionDay(offset + 1)),
			})),
		});
		return true;
	});
	if (!started) return false;

	// After the payment is answered: the read is a model call, the webhook must not wait on it.
	afterResponse(async () => {
		const { writeFirstLetter } = await import(
			"@/services/checkpoints/flows/ai-curator"
		);
		await writeFirstLetter(checkpointId);
	});
	return true;
};
