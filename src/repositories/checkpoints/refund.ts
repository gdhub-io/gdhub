import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	PayableType,
	PaymentStatus,
	Prisma,
} from "@gdhub-io/gdhub-prisma";
import { adminVerdictOpen, draftComplete } from "@/lib/checkpoints/admin";
import {
	callCost,
	callPrice,
	checkpointMargin,
	microsToMinor,
} from "@/lib/checkpoints/costs";
import { noFeeReason } from "@/lib/checkpoints/fee";
import {
	REFUND_REASONS,
	type RefundCase,
	type RefundRowReason,
	reasonRefused,
	refundAmount,
} from "@/lib/checkpoints/refund";
import { isOpen, isRunning } from "@/lib/checkpoints/status";
import { verdictDueBy } from "@/lib/checkpoints/verdict-window";
import {
	FEEDBACK_SELECT,
	toDto as feedbackDto,
} from "@/repositories/checkpoints/feedback";
import { checkpointNumbers } from "@/repositories/checkpoints/number";
import { prisma } from "@/services/prisma";
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
export const CAPTURED: PaymentStatus[] = [
	PaymentStatus.COMPLETED,
	PaymentStatus.PARTIALLY_REFUNDED,
	PaymentStatus.REFUNDED,
];

export const refundedTotal = (refunds: { amount: number }[]) =>
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
				provider: true,
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
 * What a refund leaves behind: its own row and the payment's status. The webhook
 * may have written the row first — the provider's id is the key, so there is one
 * either way.
 */
export const refundWrites = (
	db: Pick<typeof prisma, "refund" | "payment">,
	payment: { id: string; amount: number },
	providerRefund: { id: string; amount: number; currency: string },
	reason: RefundRowReason,
) =>
	[
		db.refund.upsert({
			where: { providerRefundId: providerRefund.id },
			create: {
				paymentId: payment.id,
				amount: providerRefund.amount,
				currency: providerRefund.currency.toUpperCase(),
				reason,
				providerRefundId: providerRefund.id,
			},
			update: { reason },
		}),
		db.payment.update({
			where: { id: payment.id },
			data: {
				status:
					providerRefund.amount >= payment.amount
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
		paid AS (
			SELECT "payableId" AS id, SUM(amount) AS paid FROM taken GROUP BY "payableId"
		),
		refunded AS (
			SELECT t."payableId" AS id, SUM(r.amount) AS refunded
			FROM "Refund" r
			JOIN taken t ON t.id = r."paymentId"
			GROUP BY t."payableId"
		),
		fees AS (
			SELECT f."checkpointId" AS id, SUM(f.amount) AS fees
			FROM "CheckpointFee" f
			JOIN cp ON cp.id = f."checkpointId"
			GROUP BY f."checkpointId"
		),
		ai_usage AS (
			SELECT u."checkpointId" AS id, SUM(u.cost) AS ai_micros
			FROM "CheckpointAiUsage" u
			JOIN cp ON cp.id = u."checkpointId"
			GROUP BY u."checkpointId"
		),
		sessions AS (
			SELECT s."checkpointId" AS id,
				SUM(s."participantMinutes") AS person_minutes,
				-- callMinutes in lib/checkpoint-costs.ts: from the curator's join to the end, rounded up.
				SUM(GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s."endedAt" - s."curatorJoinedAt")) / 60)))
					FILTER (WHERE s."endedAt" IS NOT NULL AND s."curatorJoinedAt" IS NOT NULL) AS minutes
			FROM "CheckpointSession" s
			JOIN cp ON cp.id = s."checkpointId"
			GROUP BY s."checkpointId"
		)
		SELECT cp.finished,
			COALESCE(SUM(paid.paid), 0)::float AS paid,
			COALESCE(SUM(refunded.refunded), 0)::float AS refunded,
			COALESCE(SUM(fees.fees), 0)::float AS fees,
			COALESCE(SUM(ai_usage.ai_micros), 0)::float AS ai_micros,
			COALESCE(SUM(sessions.person_minutes), 0)::float AS person_minutes,
			COALESCE(SUM(sessions.minutes), 0)::float AS minutes,
			(COUNT(*) FILTER (WHERE cp."curatorKind" = 'AI'))::float AS ai,
			(COUNT(*) FILTER (WHERE cp."curatorKind" = 'Human'))::float AS human
		FROM cp
		LEFT JOIN paid ON paid.id = cp.id
		LEFT JOIN refunded ON refunded.id = cp.id
		LEFT JOIN fees ON fees.id = cp.id
		LEFT JOIN ai_usage ON ai_usage.id = cp.id
		LEFT JOIN sessions ON sessions.id = cp.id
		GROUP BY cp.finished
	`;

	const money = rows.map((row) => {
		const calls = callPrice(row.person_minutes, row.minutes).total;
		const ai = microsToMinor(row.ai_micros);
		return {
			...row,
			calls,
			aiCost: ai,
			margin: checkpointMargin({
				paid: row.paid,
				refunded: row.refunded,
				fee: row.fees,
				calls,
				ai,
			}),
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
	// The AI curator's health: how many of its rated verdicts were rated 1–2.
	const aiRatedWhere = {
		...where,
		curatorKind: CheckpointCuratorKind.AI,
		feedback: { isNot: null },
	} satisfies Prisma.ProjectCheckpointWhereInput;
	const [total, rows, stages, totals, aiRated, aiRatedLow] = await Promise.all([
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
				feedback: { select: FEEDBACK_SELECT },
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
		prisma.projectCheckpoint.count({ where: aiRatedWhere }),
		prisma.projectCheckpoint.count({
			where: { ...aiRatedWhere, feedback: { rating: { lte: 2 } } },
		}),
	]);

	const ids = rows.map((row) => row.id);
	const [payments, numbers, fees, sessions, aiUsage] = await Promise.all([
		prisma.payment.findMany({
			where: {
				payableType: PayableType.CHECKPOINT,
				payableId: { in: ids },
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
		checkpointNumbers(rows),
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
		items: rows.map((row) => {
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
				number: numbers.get(row.id) ?? 1,
				stageName: row.stageName,
				status: row.status,
				curatorKind: row.curatorKind,
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
				verdict: row.verdict,
				fee: fee && {
					amount: fee.amount,
					reason: fee.reason,
					parts: fee.parts,
				},
				noFee:
					finished && !fee && row.curatorKind === CheckpointCuratorKind.Human
						? noFeeReason(row)
						: null,
				calls,
				aiCost: ai,
				rating: row.feedback && feedbackDto(row.feedback),
				margin: finished
					? checkpointMargin({
							paid: payment?.amount ?? 0,
							refunded,
							fee: fee?.amount ?? 0,
							calls: calls.total,
							ai,
						})
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
							isOpen(row.status),
				canDelete: !payment && isOpen(row.status),
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
