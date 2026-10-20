import {
	AuditAction,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	PaymentStatus,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import { refundAmount } from "@/lib/checkpoint-refund";
import { verdictOverdue } from "@/lib/checkpoint-verdict-window";
import {
	bookSessions,
	SlotTakenError,
} from "@/repositories/advisor-availability";
import { startAiCheckpoint } from "@/repositories/checkpoint-payment";
import { refundCaseOf } from "@/repositories/checkpoint-refund";
import {
	afterVerdictSent,
	type CuratorVerdictInput,
} from "@/repositories/checkpoint-verdict.repository";
import {
	appUrl,
	notify,
	notifyAuthorOfRefund,
	notifyCuratorAsked,
	recipient,
} from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import { refundCheckout } from "@/services/stripe/server";

/**
 * What only an administrator does to a checkpoint: write a verdict its curator
 * never sent, and put a curator on it by hand — a free checkpoint from a draft,
 * or a replacement on a running one. Each writes an audit row.
 */

const audit = (
	adminId: string,
	checkpointId: string,
	meta: Prisma.InputJsonObject,
) => ({
	actorUserId: adminId,
	entity: "checkpoint_admin",
	entityId: checkpointId,
	action: AuditAction.UPDATE,
	meta,
});

/**
 * The refund that goes with an admin's verdict: the parts nobody delivered,
 * the admin's verdict counted as delivered — so only calls never joined.
 * Null when the checkpoint was given for free or the money already went back.
 */
export const missedCallsRefund = async (checkpointId: string) => {
	const found = await refundCaseOf(checkpointId);
	if (!found || found.payment.refunds.length) return null;

	const amount = refundAmount({ ...found.refund, verdictSent: true });

	return { ...amount, sessionId: found.payment.providerTransactionId, found };
};

export const writeAdminVerdict = async (
	checkpointId: string,
	adminId: string,
	{ verdict, note }: CuratorVerdictInput,
	now = new Date(),
) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: { status: true, verdict: true, dueAt: true, curatorKind: true },
	});
	if (!checkpoint || checkpoint.curatorKind !== CheckpointCuratorKind.Human) {
		return { ok: false as const, error: "notFound" as const };
	}
	if (checkpoint.verdict || checkpoint.status !== CheckpointStatus.Review) {
		return { ok: false as const, error: "alreadyDecided" as const };
	}
	if (!checkpoint.dueAt || !verdictOverdue(checkpoint.dueAt, now)) {
		return { ok: false as const, error: "notOverdue" as const };
	}

	// The money first: a verdict written without its refund would leave a
	// closed checkpoint nothing can refund any more.
	const missed = await missedCallsRefund(checkpointId);
	const stripeRefund =
		missed && missed.refund > 0 && missed.sessionId
			? await refundCheckout(missed.sessionId, {
					amount: missed.refund,
					idempotencyKey: `checkpoint-refund-${checkpointId}`,
				}).catch((error) => {
					console.error("[admin-verdict] Stripe refused", checkpointId, error);
					return null;
				})
			: undefined;
	if (stripeRefund === null) {
		return { ok: false as const, error: "refundFailed" as const };
	}

	const payment = missed?.found.payment;
	const { count } = await prisma.$transaction(async (tx) => {
		const written = await tx.projectCheckpoint.updateMany({
			where: {
				id: checkpointId,
				status: CheckpointStatus.Review,
				verdict: null,
			},
			data: {
				status: CheckpointStatus.Closed,
				verdict,
				verdictNote: note,
				decidedAt: now,
				decidedById: adminId,
				verdictDraft: null,
				verdictDraftNote: null,
				verdictDraftAt: null,
			},
		});
		if (stripeRefund && payment) {
			await tx.refund.upsert({
				where: { providerRefundId: stripeRefund.id },
				create: {
					paymentId: payment.id,
					amount: stripeRefund.amount,
					currency: stripeRefund.currency.toUpperCase(),
					reason: "missedCalls",
					providerRefundId: stripeRefund.id,
				},
				update: { reason: "missedCalls" },
			});
			await tx.payment.update({
				where: { id: payment.id },
				data: {
					status:
						stripeRefund.amount >= payment.amount
							? PaymentStatus.REFUNDED
							: PaymentStatus.PARTIALLY_REFUNDED,
				},
			});
		}
		await tx.auditLog.create({
			data: audit(adminId, checkpointId, {
				action: "verdictByAdmin",
				verdict,
				refunded: stripeRefund?.amount ?? 0,
			}),
		});
		return written;
	});
	// The curator sent theirs a moment earlier: theirs stands.
	if (!count) return { ok: false as const, error: "alreadyDecided" as const };

	await Promise.all([
		afterVerdictSent(checkpointId),
		stripeRefund
			? notifyAuthorOfRefund(
					checkpointId,
					formatCheckpointMoney(stripeRefund.amount),
					"noVerdict",
				)
			: null,
	]);

	return { ok: true as const, refunded: stripeRefund?.amount ?? 0 };
};

/** A curator can be swapped while one is asked or running; not after the verdict. */
const SWAPPABLE: CheckpointStatus[] = [
	CheckpointStatus.AwaitingCurator,
	CheckpointStatus.Active,
	CheckpointStatus.Review,
];

export type AssignCuratorInput = {
	kind: CheckpointCuratorKind;
	userId?: string;
	reason: string;
};

/**
 * Puts a curator on a checkpoint by hand. On a draft it gives the checkpoint
 * away: no payment, and it starts as a paid one would — the AI at once, a
 * person asked, with the calls booked at the time the author chose. On a
 * running one it replaces the person curating it; the calls keep their times.
 */
export const assignCurator = async (
	checkpointId: string,
	adminId: string,
	{ kind, userId, reason }: AssignCuratorInput,
) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			status: true,
			goal: true,
			curatorKind: true,
			curatorId: true,
			startedAt: true,
			project: { select: { name: true, slug: true, author: recipient } },
			_count: {
				select: { items: { where: { kind: CheckpointItemKind.Input } } },
			},
		},
	});
	if (!checkpoint) return { ok: false as const, error: "notFound" as const };

	const human = kind === CheckpointCuratorKind.Human;
	if (human && !userId) {
		return { ok: false as const, error: "curatorMissing" as const };
	}
	const curator = human
		? await prisma.user.findUnique({ where: { id: userId }, ...recipient })
		: null;
	if (human && !curator) {
		return { ok: false as const, error: "curatorMissing" as const };
	}

	const meta = {
		action: "curatorAssigned",
		reason,
		fromKind: checkpoint.curatorKind,
		fromCuratorId: checkpoint.curatorId,
		toKind: kind,
		toCuratorId: curator?.id ?? null,
	};

	if (checkpoint.status === CheckpointStatus.Draft) {
		if (!checkpoint.goal.trim() || !checkpoint._count.items) {
			return { ok: false as const, error: "draftIncomplete" as const };
		}
		if (human && !checkpoint.startedAt) {
			return { ok: false as const, error: "firstCallMissing" as const };
		}

		const pick = { curatorKind: kind, curatorId: curator?.id ?? null };

		if (!human) {
			await prisma.projectCheckpoint.update({
				where: { id: checkpointId },
				data: pick,
			});
			await startAiCheckpoint(checkpointId, null);
		} else {
			try {
				await prisma.$transaction(async (tx) => {
					await tx.projectCheckpoint.update({
						where: { id: checkpointId },
						data: { ...pick, status: CheckpointStatus.AwaitingCurator },
					});
					await bookSessions(tx, checkpointId);
				});
			} catch (error) {
				if (error instanceof SlotTakenError) {
					return { ok: false as const, error: "slotTaken" as const };
				}
				throw error;
			}
		}
		await prisma.auditLog.create({
			data: audit(adminId, checkpointId, { ...meta, free: true }),
		});
		if (human) await notifyCuratorAsked(checkpointId);
		return { ok: true as const };
	}

	if (
		!SWAPPABLE.includes(checkpoint.status) ||
		checkpoint.curatorKind !== CheckpointCuratorKind.Human ||
		!human
	) {
		return { ok: false as const, error: "notSwappable" as const };
	}

	await prisma.$transaction([
		prisma.projectCheckpoint.update({
			where: { id: checkpointId },
			data: { curatorId: curator?.id },
		}),
		prisma.auditLog.create({ data: audit(adminId, checkpointId, meta) }),
	]);

	await Promise.all([
		curator &&
			notify(curator, `cp-curator-assigned-${checkpointId}-${curator.id}`, {
				title: `You now curate ${checkpoint.project.name}`,
				message:
					"An administrator handed this checkpoint to you. The calls keep their times; open it to read where it stands.",
				redirectUrl: `${appUrl()}/advisor/checkpoints`,
			}),
		notify(
			checkpoint.project.author,
			`cp-curator-replaced-${checkpointId}-${curator?.id}`,
			{
				title: `${checkpoint.project.name} has a new curator`,
				message:
					"Your curator could not go on, so we put another in their place. The calls keep their times.",
				redirectUrl: `${appUrl()}/user/project/${checkpoint.project.slug}/workflow`,
			},
		),
	]);

	return { ok: true as const };
};
