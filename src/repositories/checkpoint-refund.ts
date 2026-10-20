import {
	AuditAction,
	CheckpointStatus,
	PayableType,
	PaymentStatus,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import {
	REFUND_REASONS,
	type RefundCase,
	type RefundReason,
	reasonRefused,
	refundAmount,
	withdrawalEndsAt,
} from "@/lib/checkpoint-refund";
import { closeCheckpointRoom, syncChat } from "@/services/chat/checkpoint-room";
import { notifyAuthorOfRefund } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import { refundCheckoutPart } from "@/services/stripe/server";

/**
 * Refunds a running checkpoint owes: withdrawal within 14 days, a curator gone
 * with no replacement, or no verdict by day 31. An administrator confirms each
 * one; the amount is always worked out here, never taken from the client.
 *
 * One refund per checkpoint. Any refund already on its payment — this one, a
 * webhook replay, or one issued by hand in the Stripe dashboard — closes it.
 */

/** The price was taken: a hold still waiting is released, not refunded. */
const CAPTURED: PaymentStatus[] = [
	PaymentStatus.COMPLETED,
	PaymentStatus.PARTIALLY_REFUNDED,
	PaymentStatus.REFUNDED,
];

const caseOf = async (checkpointId: string) => {
	const [checkpoint, payment] = await Promise.all([
		prisma.projectCheckpoint.findUnique({
			where: { id: checkpointId },
			select: {
				curatorKind: true,
				status: true,
				dueAt: true,
				verdict: true,
				sessions: {
					select: { index: true, curatorJoinedAt: true, contentStatus: true },
				},
			},
		}),
		prisma.payment.findFirst({
			where: {
				payableType: PayableType.CHECKPOINT,
				payableId: checkpointId,
				status: { in: CAPTURED },
			},
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				amount: true,
				currency: true,
				createdAt: true,
				providerTransactionId: true,
				refunds: {
					orderBy: { createdAt: "asc" },
					select: { amount: true, reason: true, createdAt: true },
				},
			},
		}),
	]);

	if (!checkpoint || !payment) return null;

	const refund: RefundCase = {
		curatorKind: checkpoint.curatorKind,
		status: checkpoint.status,
		paid: payment.amount,
		paidAt: payment.createdAt,
		dueAt: checkpoint.dueAt,
		verdictSent: !!checkpoint.verdict,
		sessions: checkpoint.sessions,
	};

	return { refund, payment };
};

/** What the admin's dialog shows: the paid sum and, per reason, what goes back. */
export const quoteCheckpointRefund = async (
	checkpointId: string,
	now = new Date(),
) => {
	const found = await caseOf(checkpointId);
	if (!found) return null;

	const { refund, payment } = found;
	const done = payment.refunds.at(0) ?? null;

	return {
		paid: payment.amount,
		paidAt: payment.createdAt.toISOString(),
		withdrawalEndsAt: withdrawalEndsAt(payment.createdAt).toISOString(),
		refunded: done && {
			amount: payment.refunds.reduce((sum, row) => sum + row.amount, 0),
			reason: done.reason,
			at: done.createdAt.toISOString(),
		},
		curatorKind: refund.curatorKind,
		verdictSent: refund.verdictSent,
		// The same sum whatever the reason: only whether it applies differs.
		...refundAmount(refund),
		reasons: REFUND_REASONS.map((reason) => ({
			reason,
			refused: reasonRefused(refund, reason, now),
		})),
	};
};

export type CheckpointRefundQuote = NonNullable<
	Awaited<ReturnType<typeof quoteCheckpointRefund>>
>;

export const issueCheckpointRefund = async (
	checkpointId: string,
	reason: RefundReason,
	adminId: string,
	now = new Date(),
) => {
	const found = await caseOf(checkpointId);
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

	const stripeRefund = await refundCheckoutPart(
		sessionId,
		amount,
		`checkpoint-refund-${checkpointId}`,
	).catch((error) => {
		console.error("[checkpoint-refund] Stripe refused", checkpointId, error);
		return null;
	});
	if (!stripeRefund)
		return { ok: false as const, error: "refundFailed" as const };

	const meta = { reason, amount, provided, parts, paid: payment.amount };

	// The webhook for this refund may already have written its row: the
	// Stripe id is the key, so either way there is one.
	await prisma.$transaction([
		prisma.refund.upsert({
			where: { providerRefundId: stripeRefund.id },
			create: {
				paymentId: payment.id,
				amount: stripeRefund.amount,
				currency: stripeRefund.currency.toUpperCase(),
				reason,
				providerRefundId: stripeRefund.id,
			},
			update: { reason },
		}),
		prisma.payment.update({
			where: { id: payment.id },
			data: {
				status:
					stripeRefund.amount >= payment.amount
						? PaymentStatus.REFUNDED
						: PaymentStatus.PARTIALLY_REFUNDED,
			},
		}),
		// No verdict, no certificate: it ends as Cancelled, not Closed.
		prisma.projectCheckpoint.update({
			where: { id: checkpointId },
			data: { status: CheckpointStatus.Cancelled },
		}),
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

	await Promise.all([
		syncChat(`refund ${checkpointId}`, () => closeCheckpointRoom(checkpointId)),
		notifyAuthorOfRefund(
			checkpointId,
			formatCheckpointMoney(stripeRefund.amount),
			reason,
		),
	]);

	return { ok: true as const, amount: stripeRefund.amount };
};

const ADMIN_PAGE_SIZE = 20;

/** Payments that make a checkpoint "paid" for the admin list: held, taken or returned. */
const PAID: PaymentStatus[] = [PaymentStatus.PROCESSING, ...CAPTURED];

/** Every paid checkpoint, newest payment first, for the admin checkpoints list. */
export const listAdminCheckpoints = async ({
	status,
	query,
	page = 1,
}: {
	status?: CheckpointStatus;
	query?: string;
	page?: number;
}) => {
	const payments = await prisma.payment.findMany({
		where: { payableType: PayableType.CHECKPOINT, status: { in: PAID } },
		orderBy: { createdAt: "desc" },
		select: {
			payableId: true,
			amount: true,
			status: true,
			refunds: { select: { amount: true, reason: true } },
		},
	});
	// A declined checkpoint paid again has two rows; the newest one speaks for it.
	const paymentOf = new Map<string, (typeof payments)[number]>();
	for (const payment of payments) {
		if (!paymentOf.has(payment.payableId))
			paymentOf.set(payment.payableId, payment);
	}

	const where: Prisma.ProjectCheckpointWhereInput = {
		id: { in: [...paymentOf.keys()] },
		...(status && { status }),
		...(query && {
			project: { name: { contains: query, mode: "insensitive" } },
		}),
	};
	const [total, rows] = await Promise.all([
		prisma.projectCheckpoint.count({ where }),
		prisma.projectCheckpoint.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * ADMIN_PAGE_SIZE,
			take: ADMIN_PAGE_SIZE,
			select: {
				id: true,
				order: true,
				stageName: true,
				status: true,
				curatorKind: true,
				curator: { select: { name: true } },
				project: { select: { name: true, slug: true } },
			},
		}),
	]);

	return {
		total,
		pageSize: ADMIN_PAGE_SIZE,
		items: rows.map((row) => {
			const payment = paymentOf.get(row.id);
			const refunded =
				payment?.refunds.reduce((sum, r) => sum + r.amount, 0) ?? 0;

			return {
				id: row.id,
				number: row.order,
				stageName: row.stageName,
				status: row.status,
				curatorKind: row.curatorKind,
				curatorName: row.curator?.name ?? null,
				project: row.project,
				paid: payment?.amount ?? 0,
				refunded: refunded || null,
				refundReason: payment?.refunds[0]?.reason ?? null,
				canRefund:
					!refunded &&
					!!payment &&
					CAPTURED.includes(payment.status) &&
					(row.status === CheckpointStatus.Active ||
						row.status === CheckpointStatus.Review),
			};
		}),
	};
};

export type AdminCheckpointsPage = Awaited<
	ReturnType<typeof listAdminCheckpoints>
>;
