import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
} from "@gdhub-io/gdhub-prisma";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import { adminVerdictOpen, draftComplete } from "@/lib/checkpoints/admin";
import { appUrl } from "@/lib/checkpoints/hrefs";
import { checkpointMove, isOpen } from "@/lib/checkpoints/status";
import {
	bookSessions,
	SlotTakenError,
} from "@/repositories/advisor/availability";
import {
	type AssignCuratorInput,
	audit,
	missedCallsRefund,
} from "@/repositories/checkpoints/admin";
import { recipient } from "@/repositories/checkpoints/recipient";
import { refundWrites } from "@/repositories/checkpoints/refund";
import type { CuratorVerdictInput } from "@/repositories/checkpoints/verdict";
import { startAiCheckpoint } from "@/services/checkpoints/flows/payment";
import { sendCheckpointRefund } from "@/services/checkpoints/flows/refund";
import { afterVerdictSent } from "@/services/checkpoints/flows/verdict";
import {
	notify,
	notifyAuthorOfRefund,
	notifyCuratorAsked,
} from "@/services/checkpoints/notifications";
import { prisma } from "@/services/prisma";

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
	if (!adminVerdictOpen(checkpoint, now)) {
		return { ok: false as const, error: "notOverdue" as const };
	}

	// The money first: a verdict written without its refund would leave a
	// closed checkpoint nothing can refund any more.
	const missed = await missedCallsRefund(checkpointId);
	const payment = missed?.payment;
	const providerRefund =
		missed && missed.refund > 0 && payment?.providerTransactionId
			? await sendCheckpointRefund(
					checkpointId,
					{
						provider: payment.provider,
						providerTransactionId: payment.providerTransactionId,
					},
					missed.refund,
				)
			: undefined;
	if (providerRefund === null) {
		return { ok: false as const, error: "refundFailed" as const };
	}

	const { count } = await prisma.$transaction(async (tx) => {
		const move = checkpointMove(
			CheckpointStatus.Review,
			CheckpointStatus.Closed,
		);
		const written = await tx.projectCheckpoint.updateMany({
			where: { id: checkpointId, ...move.where, verdict: null },
			data: {
				...move.data,
				verdict,
				verdictNote: note,
				decidedAt: now,
				decidedById: adminId,
				verdictDraft: null,
				verdictDraftNote: null,
				verdictDraftAt: null,
			},
		});
		if (providerRefund && payment) {
			await Promise.all(
				refundWrites(tx, payment, providerRefund, "missedCalls"),
			);
		}
		await tx.auditLog.create({
			data: audit(adminId, checkpointId, {
				action: "verdictByAdmin",
				verdict,
				refunded: providerRefund?.amount ?? 0,
			}),
		});
		return written;
	});
	// The curator sent theirs a moment earlier: theirs stands.
	if (!count) return { ok: false as const, error: "alreadyDecided" as const };

	await Promise.all([
		afterVerdictSent(checkpointId),
		providerRefund
			? notifyAuthorOfRefund(
					checkpointId,
					formatCheckpointMoney(providerRefund.amount),
					"noVerdict",
				)
			: null,
	]);

	return { ok: true as const, refunded: providerRefund?.amount ?? 0 };
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
			sessions: {
				where: { curatorJoinedAt: null },
				orderBy: { index: "asc" },
				take: 1,
				select: { index: true },
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
		if (
			!draftComplete({ goal: checkpoint.goal, inputs: checkpoint._count.items })
		) {
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
			if (!(await startAiCheckpoint(checkpointId, null))) {
				return { ok: false as const, error: "notSwappable" as const };
			}
		} else {
			try {
				const move = checkpointMove(
					CheckpointStatus.Draft,
					CheckpointStatus.AwaitingCurator,
				);
				const asked = await prisma.$transaction(async (tx) => {
					const { count } = await tx.projectCheckpoint.updateMany({
						where: { id: checkpointId, ...move.where },
						data: { ...pick, ...move.data },
					});
					if (count) await bookSessions(tx, checkpointId);
					return count > 0;
				});
				if (!asked)
					return { ok: false as const, error: "notSwappable" as const };
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
		!isOpen(checkpoint.status) ||
		checkpoint.curatorKind !== CheckpointCuratorKind.Human ||
		!curator
	) {
		return { ok: false as const, error: "notSwappable" as const };
	}

	await prisma.$transaction([
		prisma.projectCheckpoint.update({
			where: { id: checkpointId },
			data: { curatorId: curator.id },
		}),
		prisma.auditLog.create({
			data: audit(adminId, checkpointId, {
				...meta,
				// The first call the new curator holds: the payout (GDHUB-74) pays them
				// from here and the verdict, and the one who left nothing.
				fromSession: checkpoint.sessions[0]?.index ?? null,
			}),
		}),
	]);

	await Promise.all([
		notify(curator, `cp-curator-assigned-${checkpointId}-${curator.id}`, {
			checkpointId,
			title: `You now curate ${checkpoint.project.name}`,
			message:
				"An administrator handed this checkpoint to you. The calls keep their times; open it to read where it stands.",
			redirectUrl: `${appUrl()}/advisor/checkpoints`,
		}),
		notify(
			checkpoint.project.author,
			`cp-curator-replaced-${checkpointId}-${curator.id}`,
			{
				checkpointId,
				title: `${checkpoint.project.name} has a new curator`,
				message:
					"Your curator could not go on, so we put another in their place. The calls keep their times.",
				redirectUrl: `${appUrl()}/user/project/${checkpoint.project.slug}/workflow`,
			},
		),
	]);

	return { ok: true as const };
};
