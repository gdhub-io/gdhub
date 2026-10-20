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
import { callCost, callPrice, microsToMinor } from "@/lib/checkpoint-costs";
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
import { recordCheckpointFee } from "@/repositories/checkpoint-fee";
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
		// A withdrawal still pays the curator for the calls held (§3.3).
		reason === "withdrawal"
			? recordCheckpointFee(checkpointId, now).catch((error) =>
					console.error(`[fee] checkpoint ${checkpointId}`, error),
				)
			: null,
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
	const rows = await prisma.$queryRaw<
		{
			finished: boolean;
			paid: number;
			refunded: number;
			fees: number;
			ai_micros: number;
			person_minutes: number;
			minutes: number;
			ai: number;
			human: number;
		}[]
	>`
		WITH cp AS (
			SELECT c.id, c."curatorKind", c.status IN ('Closed', 'Cancelled') AS finished
			FROM "ProjectCheckpoint" c
			JOIN "Project" pr ON pr.id = c."projectId"
			WHERE ${Prisma.join(conditions, " AND ")}
		),
		taken AS (
			SELECT p.id, p.amount, p."payableId"
			FROM "Payment" p
			JOIN cp ON cp.id = p."payableId"
			WHERE p."payableType" = 'CHECKPOINT'
				AND p.status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED')
		),
		per AS (
			SELECT cp.finished, cp."curatorKind",
				(SELECT COALESCE(SUM(t.amount), 0) FROM taken t WHERE t."payableId" = cp.id) AS paid,
				(SELECT COALESCE(SUM(r.amount), 0) FROM "Refund" r JOIN taken t ON t.id = r."paymentId" WHERE t."payableId" = cp.id) AS refunded,
				(SELECT COALESCE(SUM(f.amount), 0) FROM "CheckpointFee" f WHERE f."checkpointId" = cp.id) AS fees,
				(SELECT COALESCE(SUM(u.cost), 0) FROM "CheckpointAiUsage" u WHERE u."checkpointId" = cp.id) AS ai_micros,
				(SELECT COALESCE(SUM(s."participantMinutes"), 0) FROM "CheckpointSession" s WHERE s."checkpointId" = cp.id) AS person_minutes,
				(SELECT COALESCE(SUM(GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s."endedAt" - s."curatorJoinedAt")) / 60))), 0)
					FROM "CheckpointSession" s
					WHERE s."checkpointId" = cp.id AND s."endedAt" IS NOT NULL AND s."curatorJoinedAt" IS NOT NULL) AS minutes
			FROM cp
		)
		SELECT finished,
			SUM(paid)::float AS paid,
			SUM(refunded)::float AS refunded,
			SUM(fees)::float AS fees,
			SUM(ai_micros)::float AS ai_micros,
			SUM(person_minutes)::float AS person_minutes,
			SUM(minutes)::float AS minutes,
			(COUNT(*) FILTER (WHERE "curatorKind" = 'AI'))::float AS ai,
			(COUNT(*) FILTER (WHERE "curatorKind" = 'Human'))::float AS human
		FROM per
		GROUP BY finished
	`;

	const money = rows.map((row) => {
		const calls = callPrice(row.person_minutes, row.minutes).total;
		const ai = microsToMinor(row.ai_micros);
		return {
			...row,
			calls,
			aiCost: ai,
			margin: row.paid - row.refunded - row.fees - calls - ai,
		};
	});
	const sum = (pick: (row: (typeof money)[number]) => number) =>
		money.reduce((total, row) => total + pick(row), 0);
	const paid = sum((row) => row.paid);
	const refunded = sum((row) => row.refunded);

	return {
		paid,
		refunded,
		net: paid - refunded,
		fees: sum((row) => row.fees),
		calls: sum((row) => row.calls),
		aiCost: sum((row) => row.aiCost),
		// Running ones have no fee yet and would read as margin they are not.
		margin: money.find((row) => row.finished)?.margin ?? 0,
		ai: sum((row) => row.ai),
		human: sum((row) => row.human),
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
				curatorId: true,
				decidedById: true,
				goal: true,
				curator: { select: { name: true } },
				project: { select: { name: true } },
				feedback: { select: { rating: true, comment: true, createdAt: true } },
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
	// The AI curator's health: how many of its rated verdicts were rated 1–2.
	const aiRatedWhere = {
		...where,
		curatorKind: CheckpointCuratorKind.AI,
		feedback: { isNot: null },
	} satisfies Prisma.ProjectCheckpointWhereInput;
	const [aiRated, aiRatedLow] = await Promise.all([
		prisma.projectCheckpoint.count({ where: aiRatedWhere }),
		prisma.projectCheckpoint.count({
			where: { ...aiRatedWhere, feedback: { rating: { lte: 2 } } },
		}),
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
	const ids = rows.map((row) => row.id);
	const [fees, sessions, aiUsage] = await Promise.all([
		prisma.checkpointFee.findMany({
			where: { checkpointId: { in: ids } },
			select: { checkpointId: true, amount: true, reason: true, parts: true },
		}),
		prisma.checkpointSession.findMany({
			where: { checkpointId: { in: ids } },
			select: {
				checkpointId: true,
				participantMinutes: true,
				curatorJoinedAt: true,
				endedAt: true,
			},
		}),
		prisma.checkpointAiUsage.groupBy({
			by: ["checkpointId"],
			where: { checkpointId: { in: ids } },
			_sum: { cost: true },
		}),
	]);

	return {
		total,
		pageSize: ADMIN_PAGE_SIZE,
		stages: stages.map((row) => row.stageName),
		totals: { ...totals, aiRated, aiRatedLow },
		items: rows.map((row, index) => {
			// A declined checkpoint paid again has two rows; the newest speaks for it.
			const payment = payments.find((one) => one.payableId === row.id);
			const refunded = payment ? refundedTotal(payment.refunds) : 0;
			const overdue = adminVerdictOpen(row, now);
			const fee = fees.find((one) => one.checkpointId === row.id) ?? null;
			const calls = callCost(
				sessions.filter((one) => one.checkpointId === row.id),
			);
			const ai = microsToMinor(
				aiUsage.find((one) => one.checkpointId === row.id)?._sum.cost ?? 0,
			);
			const finished =
				!isRunning(row.status) && row.status !== CheckpointStatus.Draft;

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
				fee: fee && {
					amount: fee.amount,
					reason: fee.reason,
					parts: fee.parts,
				},
				noFee:
					finished && !fee && row.curatorKind === CheckpointCuratorKind.Human
						? row.decidedById && row.decidedById !== row.curatorId
							? ("adminVerdict" as const)
							: ("stopped" as const)
						: null,
				calls,
				aiCost: ai,
				rating: row.feedback && {
					rating: row.feedback.rating,
					comment: row.feedback.comment,
					createdAt: row.feedback.createdAt.toISOString(),
				},
				margin: finished
					? (payment?.amount ?? 0) -
						refunded -
						(fee?.amount ?? 0) -
						calls.total -
						ai
					: null,
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
