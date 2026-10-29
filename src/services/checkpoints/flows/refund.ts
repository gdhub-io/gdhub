import {
	AuditAction,
	CheckpointStatus,
	type PaymentProvider,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import {
	type RefundReason,
	reasonRefused,
	refundAmount,
} from "@/lib/checkpoints/refund";
import {
	CHECKPOINT_RUNNING_STATUSES,
	checkpointMove,
} from "@/lib/checkpoints/status";
import { recordCheckpointFee } from "@/repositories/checkpoints/fee";
import { refundCaseOf, refundWrites } from "@/repositories/checkpoints/refund";
import { closeCheckpointRoom, syncChat } from "@/services/chat/checkpoint-room";
import { notifyAuthorOfRefund } from "@/services/checkpoints/notifications";
import { gatewayFor } from "@/services/payments/gateway";
import { prisma } from "@/services/prisma";

/**
 * Asks the provider that took the payment for part of it back; null when it
 * refuses. Keyed to the checkpoint, so a retry or a double click is the same
 * Stripe refund; Paddle has no key, and the one-refund check stands in for it.
 */
export const sendCheckpointRefund = (
	checkpointId: string,
	payment: { provider: PaymentProvider; providerTransactionId: string },
	amount: number,
) =>
	gatewayFor(payment.provider)
		.refund(payment.providerTransactionId, {
			amount,
			idempotencyKey: `checkpoint-refund-${checkpointId}`,
		})
		.catch((error) => {
			console.error("[checkpoint-refund] refused", checkpointId, error);
			return null;
		});

export const issueCheckpointRefund = async (
	checkpointId: string,
	reason: RefundReason,
	adminId: string,
	now = new Date(),
) => {
	const found = await refundCaseOf(checkpointId);
	const sessionId = found?.payment.providerTransactionId;
	if (!found || !sessionId) {
		return { ok: false as const, error: "notFound" as const };
	}

	const { refund, payment } = found;
	if (payment.refunds.length) {
		return { ok: false as const, error: "alreadyRefunded" as const };
	}

	const refused = reasonRefused(refund, reason, now);
	if (refused) return { ok: false as const, error: refused };

	const { refund: amount, provided, parts } = refundAmount(refund);
	if (amount <= 0) return { ok: false as const, error: "nothingOwed" as const };

	const providerRefund = await sendCheckpointRefund(
		checkpointId,
		{ provider: payment.provider, providerTransactionId: sessionId },
		amount,
	);
	if (!providerRefund)
		return { ok: false as const, error: "refundFailed" as const };

	const meta = { reason, amount, provided, parts, paid: payment.amount };

	// No verdict, no certificate: it ends as Cancelled, not Closed.
	const move = checkpointMove(
		CHECKPOINT_RUNNING_STATUSES,
		CheckpointStatus.Cancelled,
	);
	const [{ count: cancelled }] = await prisma.$transaction([
		prisma.projectCheckpoint.updateMany({
			where: { id: checkpointId, ...move.where },
			data: move.data,
		}),
		...refundWrites(prisma, payment, providerRefund, reason),
		prisma.auditLog.create({
			data: {
				actorUserId: adminId,
				entity: "checkpoint_refund",
				entityId: checkpointId,
				action: AuditAction.UPDATE,
				meta: meta satisfies Prisma.InputJsonObject,
			},
		}),
	]);

	// The money has gone back either way; a verdict sent meanwhile keeps it Closed.
	if (!cancelled) {
		console.error(`[refund] ${checkpointId} was decided while refunded`);
	}

	await Promise.all([
		syncChat(`refund ${checkpointId}`, () => closeCheckpointRoom(checkpointId)),
		notifyAuthorOfRefund(
			checkpointId,
			formatCheckpointMoney(providerRefund.amount),
			reason,
		),
		// A withdrawal still pays the curator for the calls held (§3.3).
		reason === "withdrawal"
			? recordCheckpointFee(checkpointId, now).catch((error) =>
					console.error(`[fee] checkpoint ${checkpointId}`, error),
				)
			: null,
	]);

	return { ok: true as const, amount: providerRefund.amount };
};
