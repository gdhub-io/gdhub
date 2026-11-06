import {
	AuditAction,
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
import { deleteCheckpoint } from "@/repositories/checkpoints/checkpoint";
import { checkpointNumber } from "@/repositories/checkpoints/number";
import {
	isCheckpointPaid,
	keptPayment,
} from "@/repositories/checkpoints/payment";
import { recipient } from "@/repositories/checkpoints/recipient";
import { refundWrites } from "@/repositories/checkpoints/refund";
import type { CuratorVerdictInput } from "@/repositories/checkpoints/verdict";
import { closeCheckpointRoom, syncChat } from "@/services/chat/checkpoint-room";
import { startAiCheckpoint } from "@/services/checkpoints/flows/payment";
import { sendCheckpointRefund } from "@/services/checkpoints/flows/refund";
import { afterVerdictSent } from "@/services/checkpoints/flows/verdict";
import {
	notify,
	notifyAuthorOfRefund,
	notifyCuratorAsked,
	workflowUrl,
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

		// A curator turned it down or never answered: the money stayed with it.
		const paidWith = (await keptPayment(checkpointId))?.id ?? null;
		const pick = {
			curatorKind: kind,
			curatorId: curator?.id ?? null,
			...(paidWith && { paymentId: paidWith }),
		};

		if (!human) {
			await prisma.projectCheckpoint.update({
				where: { id: checkpointId },
				data: pick,
			});
			if (!(await startAiCheckpoint(checkpointId, paidWith))) {
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
			data: audit(adminId, checkpointId, { ...meta, free: !paidWith }),
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

/**
 * Removes a checkpoint an admin gave for free while it is still under way —
 * never a draft, a finished one, or one holding a payment — and
 * tells its author a platform admin did it.
 */
export const deleteFreeCheckpoint = async (
	checkpointId: string,
	adminId: string,
) => {
	const [checkpoint, paid] = await Promise.all([
		prisma.projectCheckpoint.findUnique({
			where: { id: checkpointId },
			select: {
				projectId: true,
				createdAt: true,
				status: true,
				stageName: true,
				curatorKind: true,
				project: { select: { name: true, slug: true, author: recipient } },
			},
		}),
		isCheckpointPaid(checkpointId),
	]);
	if (!checkpoint) return { ok: false as const, error: "notFound" as const };
	if (paid) return { ok: false as const, error: "notFree" as const };
	// Only the project's current one, its latest: the next checkpoint then takes its number.
	if (!isOpen(checkpoint.status)) {
		return { ok: false as const, error: "notOpen" as const };
	}

	// Read before the row goes: the number counts the checkpoints around it.
	const number = await checkpointNumber(checkpoint);
	const { project } = checkpoint;

	await prisma.$transaction([
		deleteCheckpoint(checkpointId),
		prisma.auditLog.create({
			data: {
				...audit(adminId, checkpointId, {
					projectId: checkpoint.projectId,
					project: project.name,
					stageName: checkpoint.stageName,
					status: checkpoint.status,
					curatorKind: checkpoint.curatorKind,
				}),
				action: AuditAction.DELETE,
			},
		}),
	]);

	// The room is keyed by the id, not linked to the row: it stays as read-only history.
	await Promise.all([
		syncChat(`delete ${checkpointId}`, () => closeCheckpointRoom(checkpointId)),
		// No checkpointId: its journal went with it.
		notify(project.author, `cp-deleted-${checkpointId}`, {
			title: `Checkpoint ${number} of ${project.name} was deleted`,
			message:
				"A GDHub platform administrator deleted this checkpoint. Nothing was charged for it.",
			redirectUrl: workflowUrl(project.slug),
		}),
	]);

	return { ok: true as const };
};
