import {
	AuditAction,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	PayableType,
	PaymentStatus,
	Prisma,
} from "@gdhub-io/gdhub-prisma";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import {
	adminVerdictOpen,
	CURATOR_SWAPPABLE_STATUSES,
	draftComplete,
} from "@/lib/checkpoint-admin";
import {
	isRunning,
	REFUND_REASONS,
	type RefundCase,
	type RefundReason,
	type RefundRowReason,
	reasonRefused,
	refundAmount,
} from "@/lib/checkpoint-refund";
import { verdictDueBy } from "@/lib/checkpoint-verdict-window";
import { checkpointNumber } from "@/repositories/checkpoint-number";
import { closeCheckpointRoom, syncChat } from "@/services/chat/checkpoint-room";
import { notifyAuthorOfRefund } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import { refundCheckout } from "@/services/stripe/server";
import type {
	AdminCheckpointsPageDto,
	CheckpointRefundQuoteDto,
} from "@/types/checkpoints";

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

const refundedTotal = (refunds: { amount: number }[]) =>
	refunds.reduce((sum, row) => sum + row.amount, 0);

export const refundCaseOf = async (checkpointId: string) => {
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

/**
 * Asks Stripe for part of a checkpoint's payment back; null when it refuses.
 * Keyed to the checkpoint, so a retry or a double click is the same refund.
 */
export const sendCheckpointRefund = (
	checkpointId: string,
	sessionId: string,
	amount: number,
) =>
	refundCheckout(sessionId, {
		amount,
		idempotencyKey: `checkpoint-refund-${checkpointId}`,
	}).catch((error) => {
		console.error("[checkpoint-refund] Stripe refused", checkpointId, error);
		return null;
	});

/**
 * What a Stripe refund leaves behind: its own row and the payment's status.
 * The webhook may have written the row first — the Stripe id is the key, so
 * there is one either way.
 */
export const refundWrites = (
	db: Pick<typeof prisma, "refund" | "payment">,
	payment: { id: string; amount: number },
	stripeRefund: { id: string; amount: number; currency: string },
	reason: RefundRowReason,
) =>
	[
		db.refund.upsert({
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
		db.payment.update({
			where: { id: payment.id },
			data: {
				status:
					stripeRefund.amount >= payment.amount
						? PaymentStatus.REFUNDED
						: PaymentStatus.PARTIALLY_REFUNDED,
			},
		}),
	] as const;

/** What the admin's dialog shows: the paid sum and, per reason, what goes back. */
export const quoteCheckpointRefund = async (
	checkpointId: string,
	now = new Date(),
): Promise<CheckpointRefundQuoteDto | null> => {
	const found = await refundCaseOf(checkpointId);
	if (!found) return null;

	const { refund, payment } = found;
	const done = payment.refunds.at(0);

	return {
		paid: payment.amount,
		paidAt: payment.createdAt.toISOString(),
		curatorKind: refund.curatorKind,
		verdictSent: refund.verdictSent,
		// The same sum whatever the reason: only whether it applies differs.
		...refundAmount(refund),
		refunded: done
			? {
					amount: refundedTotal(payment.refunds),
					reason: done.reason as RefundRowReason | null,
					at: done.createdAt.toISOString(),
				}
			: null,
		reasons: REFUND_REASONS.map((reason) => ({
			reason,
			refused: reasonRefused(refund, reason, now),
		})),
	};
};

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

	const stripeRefund = await sendCheckpointRefund(
		checkpointId,
		sessionId,
		amount,
	);
	if (!stripeRefund)
		return { ok: false as const, error: "refundFailed" as const };

	const meta = { reason, amount, provided, parts, paid: payment.amount };

	await prisma.$transaction([
		...refundWrites(prisma, payment, stripeRefund, reason),
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

type AdminFilter = {
	status?: CheckpointStatus;
	stage?: string;
	curatorKind?: CheckpointCuratorKind;
	query?: string;
};

/**
 * The money and the curator mix behind the admin list, over every checkpoint
 * the filter matches rather than the page shown. Money counts only what was
 * taken: a hold still waiting is not revenue yet.
 */
const adminCheckpointTotals = async ({
	status,
	stage,
	curatorKind,
	query,
}: AdminFilter) => {
	const conditions = [
		status
			? Prisma.sql`c.status = ${status}::"CheckpointStatus"`
			: Prisma.sql`c.status <> 'Draft'`,
		...(stage ? [Prisma.sql`c."stageName" = ${stage}`] : []),
		...(curatorKind
			? [Prisma.sql`c."curatorKind" = ${curatorKind}::"CheckpointCuratorKind"`]
			: []),
		...(query ? [Prisma.sql`pr.name ILIKE ${`%${query}%`}`] : []),
	];
	const [row] = await prisma.$queryRaw<
		{ paid: bigint; refunded: bigint; ai: bigint; human: bigint }[]
	>`
		WITH cp AS (
			SELECT c.id, c."curatorKind"
			FROM "ProjectCheckpoint" c
			JOIN "Project" pr ON pr.id = c."projectId"
			WHERE ${Prisma.join(conditions, " AND ")}
		),
		taken AS (
			SELECT p.id, p.amount
			FROM "Payment" p
			JOIN cp ON cp.id = p."payableId"
			WHERE p."payableType" = 'CHECKPOINT'
				AND p.status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')
		)
		SELECT
			(SELECT COALESCE(SUM(amount), 0) FROM taken) AS paid,
			(SELECT COALESCE(SUM(r.amount), 0) FROM "Refund" r JOIN taken ON taken.id = r."paymentId") AS refunded,
			(SELECT COUNT(*) FROM cp WHERE "curatorKind" = 'AI') AS ai,
			(SELECT COUNT(*) FROM cp WHERE "curatorKind" = 'Human') AS human
	`;

	const paid = Number(row?.paid ?? 0);
	const refunded = Number(row?.refunded ?? 0);

	return {
		paid,
		refunded,
		net: paid - refunded,
		ai: Number(row?.ai ?? 0),
		human: Number(row?.human ?? 0),
	};
};

/**
 * Every checkpoint past Draft, newest first, for the admin checkpoints list:
 * a checkpoint leaves Draft through a payment (seeded ones aside), and one
 * cancelled before day 1 is deleted rather than kept.
 */
export const listAdminCheckpoints = async (
	{ page = 1, ...filter }: AdminFilter & { page?: number },
	now = new Date(),
): Promise<AdminCheckpointsPageDto> => {
	const { status, stage, curatorKind, query } = filter;
	const paid = { status: { not: CheckpointStatus.Draft } };
	const where: Prisma.ProjectCheckpointWhereInput = {
		...(status ? { status } : paid),
		...(stage && { stageName: stage }),
		...(curatorKind && { curatorKind }),
		...(query && {
			project: { name: { contains: query, mode: "insensitive" } },
		}),
	};
	const [total, rows, stages, totals] = await Promise.all([
		prisma.projectCheckpoint.count({ where }),
		prisma.projectCheckpoint.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip: (page - 1) * ADMIN_PAGE_SIZE,
			take: ADMIN_PAGE_SIZE,
			select: {
				id: true,
				projectId: true,
				createdAt: true,
				stageName: true,
				status: true,
				startedAt: true,
				dueAt: true,
				verdict: true,
				curatorKind: true,
				goal: true,
				curator: { select: { name: true } },
				project: { select: { name: true } },
				_count: {
					select: { items: { where: { kind: CheckpointItemKind.Input } } },
				},
			},
		}),
		prisma.projectCheckpoint.findMany({
			where: paid,
			distinct: ["stageName"],
			orderBy: { stageName: "asc" },
			select: { stageName: true },
		}),
		adminCheckpointTotals(filter),
	]);

	const [payments, numbers] = await Promise.all([
		prisma.payment.findMany({
			where: {
				payableType: PayableType.CHECKPOINT,
				payableId: { in: rows.map((row) => row.id) },
				status: { in: [PaymentStatus.PROCESSING, ...CAPTURED] },
			},
			orderBy: { createdAt: "desc" },
			select: {
				payableId: true,
				amount: true,
				status: true,
				refunds: { select: { amount: true, reason: true } },
			},
		}),
		Promise.all(rows.map((row) => checkpointNumber(row))),
	]);

	return {
		total,
		pageSize: ADMIN_PAGE_SIZE,
		stages: stages.map((row) => row.stageName),
		totals,
		items: rows.map((row, index) => {
			// A declined checkpoint paid again has two rows; the newest speaks for it.
			const payment = payments.find((one) => one.payableId === row.id);
			const refunded = payment ? refundedTotal(payment.refunds) : 0;
			const overdue = adminVerdictOpen(row, now);

			return {
				id: row.id,
				number: numbers[index],
				stageName: row.stageName,
				status: row.status,
				curatorName: row.curator?.name ?? null,
				projectName: row.project.name,
				startedAt: row.startedAt?.toISOString() ?? null,
				dueAt: row.dueAt?.toISOString() ?? null,
				paid: payment?.amount ?? null,
				refunded: refunded || null,
				refundReason:
					(payment?.refunds.at(0)?.reason as RefundRowReason | undefined) ??
					null,
				verdictDueBy: row.dueAt ? verdictDueBy(row.dueAt).toISOString() : null,
				overdue,
				canRefund:
					!refunded &&
					!!payment &&
					CAPTURED.includes(payment.status) &&
					isRunning(row.status),
				canAssign:
					row.status === CheckpointStatus.Draft
						? draftComplete({ goal: row.goal, inputs: row._count.items })
						: row.curatorKind === CheckpointCuratorKind.Human &&
							CURATOR_SWAPPABLE_STATUSES.includes(row.status),
			};
		}),
	};
};

/** Project names for the list's search, among projects with a paid checkpoint. */
export const searchCheckpointProjects = async (query: string) =>
	(
		await prisma.project.findMany({
			where: {
				name: { contains: query, mode: "insensitive" },
				checkpoints: { some: { status: { not: CheckpointStatus.Draft } } },
			},
			orderBy: { name: "asc" },
			take: 10,
			select: { name: true },
		})
	).map((project) => project.name);
