import {
	AuditAction,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	PayableType,
	type PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { after } from "next/server";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_CURRENCY,
	CHECKPOINT_MAX_TEAM,
	EXPERT_CHECKPOINT_OPEN,
	CHECKPOINT_MINOR_UNITS as MINOR,
	SESSIONS_PER_CHECKPOINT,
} from "@/config/checkpoint";
import { type CuratorLevel, curatorPrice } from "@/config/checkpoint-pricing";
import { dueDateFrom, utcStartOfDay } from "@/lib/checkpoint-days";
import { dateOfDay } from "@/lib/checkpoint-plan";
import type { RefundRowReason } from "@/lib/checkpoint-refund";
import { sessionDay } from "@/lib/checkpoint-sessions";
import {
	bookSessions,
	isFirstCallFree,
	SlotTakenError,
} from "@/repositories/advisor-availability";
import { curatorEligibleWhere } from "@/repositories/checkpoint-curators";
import { refundedTotal } from "@/repositories/checkpoint-refund";
import { curatorPersona } from "@/repositories/curator-context";
import { recordProviderRefund } from "@/repositories/payment-records";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { characterFor } from "@/services/checkpoint-curator/prompts/card";
import { notifyCuratorAsked } from "@/services/checkpoint-notifications";
import { type CheckoutPaid, gatewayFor } from "@/services/payments/gateway";
import { prisma } from "@/services/prisma";

/** The money a checkpoint holds or has taken. */
const heldPaymentWhere = (checkpointId: string) => ({
	payableType: PayableType.CHECKPOINT,
	payableId: checkpointId,
	status: { in: [PaymentStatus.PROCESSING, PaymentStatus.COMPLETED] },
});

/** Whether this checkpoint has been paid for, whatever state it is in now. */
export const isCheckpointPaid = async (checkpointId: string) =>
	(await prisma.payment.count({
		where: {
			payableType: PayableType.CHECKPOINT,
			payableId: checkpointId,
			status: PaymentStatus.COMPLETED,
		},
	})) > 0;

/**
 * What this curator costs for the 28 days, in minor units, or null when they
 * cannot be bought. A person's level is read at this moment — someone who has
 * since stopped taking mentees is not for sale.
 */
export const curatorCharge = async (
	kind: CheckpointCuratorKind | null,
	curatorId: string | null | undefined,
	stage: string,
) => {
	if (kind === CheckpointCuratorKind.AI) return CHECKPOINT_AI_PRICE * MINOR;

	const speciality = await prisma.speciality.findFirst({
		where: { ...curatorEligibleWhere(stage), userId: curatorId ?? "" },
		select: { level: true },
	});

	return speciality
		? curatorPrice(speciality.level as CuratorLevel) * MINOR
		: null;
};

/**
 * The money this checkpoint holds or has taken, in minor units, or null when
 * there is none. A curator it is handed to must cost exactly this: there is no
 * top-up and no partial refund yet.
 */
export const heldAmount = async (checkpointId: string) =>
	(
		await prisma.payment.findFirst({
			where: heldPaymentWhere(checkpointId),
			select: { amount: true },
		})
	)?.amount ?? null;

/** Minor units back to the whole ones the price table and the screen use. */
export const toWholePrice = (amount: number) => amount / MINOR;

/**
 * What a checkout for this checkpoint would charge, and for what.
 *
 * The price is computed here and never taken from the client: the screen shows
 * the same number because it runs the same table, not because it is trusted to
 * send it.
 */
export const checkpointCheckout = async (checkpointId: string) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			id: true,
			order: true,
			stageName: true,
			status: true,
			curatorKind: true,
			curatorId: true,
			startedAt: true,
			goal: true,
			curator: { select: { name: true } },
			project: {
				select: {
					id: true,
					slug: true,
					name: true,
					// The team as it stands, as the goal step and the curator's card count it.
					team: {
						select: {
							_count: { select: { members: { where: CONFIRMED_MEMBERS } } },
						},
					},
				},
			},
			_count: {
				select: { items: { where: { kind: CheckpointItemKind.Input } } },
			},
		},
	});

	if (!checkpoint) return { ok: false as const, reason: "notFound" as const };

	if (checkpoint.status !== CheckpointStatus.Draft) {
		return { ok: false as const, reason: "checkpointNotDraft" as const };
	}

	if (
		!EXPERT_CHECKPOINT_OPEN &&
		checkpoint.curatorKind === CheckpointCuratorKind.Human
	) {
		return { ok: false as const, reason: "expertClosed" as const };
	}

	// A checkpoint a curator declined goes back to Draft with the money already
	// paid. Picking someone else must not charge for it twice.
	if (await isCheckpointPaid(checkpointId)) {
		return { ok: false as const, reason: "alreadyPaid" as const };
	}

	// The goal and day 1 are what the 28 days are measured against; the wizard
	// checks them too, but a client is not where that holds.
	if (!checkpoint.goal.trim()) {
		return { ok: false as const, reason: "goalMissing" as const };
	}
	if (!checkpoint._count.items) {
		return { ok: false as const, reason: "inputsMissing" as const };
	}

	// One price covers up to CHECKPOINT_MAX_TEAM; a larger team asks for an offer.
	if ((checkpoint.project.team?._count.members ?? 0) > CHECKPOINT_MAX_TEAM) {
		return { ok: false as const, reason: "teamTooLarge" as const };
	}

	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;

	// Said before the card is asked: the payment confirming is where the five
	// calls are actually booked, and it checks again.
	if (
		!isAI &&
		(!checkpoint.curatorId ||
			!checkpoint.startedAt ||
			!(await isFirstCallFree(
				checkpoint.curatorId,
				checkpoint.startedAt,
				checkpointId,
			)))
	) {
		return { ok: false as const, reason: "slotTaken" as const };
	}

	const amount = await curatorCharge(
		checkpoint.curatorKind,
		checkpoint.curatorId,
		checkpoint.stageName,
	);

	if (amount === null) {
		return { ok: false as const, reason: "curatorUnavailable" as const };
	}

	return {
		ok: true as const,
		checkpoint,
		amount,
		currency: CHECKPOINT_CURRENCY,
		name: `${checkpoint.project.name} — checkpoint ${checkpoint.order}`,
		description: isAI
			? `${checkpoint.stageName} · 28 days with the AI curator`
			: `${checkpoint.stageName} · 28 days with ${checkpoint.curator?.name ?? "a curator"}`,
	};
};

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
 * Hands a checkpoint back to its author after its curator said no or never
 * answered: unpaid again, with that curator kept so the picker shows them as
 * unavailable — an expert who disappears from the list is one picked again.
 */
export const returnToAuthor = (
	checkpointId: string,
	curatorId: string | null,
) =>
	prisma.$transaction([
		// The calls were that curator's hours; the next one is booked afresh.
		prisma.checkpointSession.deleteMany({ where: { checkpointId } }),
		prisma.projectCheckpoint.update({
			where: { id: checkpointId },
			data: {
				status: CheckpointStatus.Draft,
				curatorId: null,
				curatorDeclinedAt: new Date(),
				paymentId: null,
				startedAt: null,
				dueAt: null,
				...(curatorId && { declinedCuratorIds: { push: curatorId } }),
			},
		}),
	]);

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
		await startAiCheckpoint(payment.payableId, payment.id);
		return true;
	}

	// The five calls are booked with the money, so the curator's hours are held
	// while they decide. Someone else may have taken the hour since the author
	// picked it: then the hold is let go and the draft asks for another time.
	try {
		await prisma.$transaction(async (tx) => {
			await bookSessions(tx, payment.payableId);
			await tx.projectCheckpoint.update({
				where: { id: payment.payableId },
				data: {
					status: CheckpointStatus.AwaitingCurator,
					paymentId: payment.id,
				},
			});
		});
		await notifyCuratorAsked(payment.payableId);
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
 * The AI curator starts on payment. The day picked may have passed while the
 * draft waited to be paid, so it starts today at the earliest; the plan waits
 * for the author's tasks and approval; the curator's character is picked from
 * the author's profile; and its five review days are written like a person's
 * calls. Then the curator reads the goal.
 */
export const startAiCheckpoint = async (
	checkpointId: string,
	/** Null when an administrator gives it for free. */
	paymentId: string | null,
	now = new Date(),
) => {
	const checkpoint = await prisma.projectCheckpoint.findUniqueOrThrow({
		where: { id: checkpointId },
		select: { startedAt: true, projectId: true },
	});
	const today = utcStartOfDay(now);
	const picked = checkpoint.startedAt && utcStartOfDay(checkpoint.startedAt);
	const startedAt = picked && picked > today ? picked : today;

	await prisma.$transaction([
		prisma.projectCheckpoint.update({
			where: { id: checkpointId },
			data: {
				status: CheckpointStatus.Active,
				paymentId,
				startedAt,
				dueAt: dueDateFrom(startedAt),
				goalAgreedAt: null,
				goalAgreedById: null,
				// Kept for the 28 days, whatever the profile says later.
				curatorCharacter: characterFor(
					await curatorPersona(checkpoint.projectId),
				),
			},
		}),
		prisma.checkpointSession.deleteMany({ where: { checkpointId } }),
		prisma.checkpointSession.createMany({
			data: Array.from({ length: SESSIONS_PER_CHECKPOINT }, (_, offset) => ({
				checkpointId,
				index: offset + 1,
				scheduledAt: dateOfDay(startedAt, sessionDay(offset + 1)),
			})),
		}),
	]);
	// After the payment is answered: the read is a model call, the webhook must not wait on it.
	afterResponse(async () => {
		const { writeFirstLetter } = await import(
			"@/repositories/checkpoint-curator.repository"
		);
		await writeFirstLetter(checkpointId);
	});
};

/** Runs `work` once the response is sent; outside a request (a script), right away. */
const afterResponse = (work: () => Promise<void>) => {
	const run = () =>
		work().catch((error) =>
			console.error("[checkpoint] after the response", error),
		);
	try {
		after(run);
	} catch {
		void run();
	}
};

type PendingCheckout = {
	id: string;
	payableId: string;
	provider: PaymentProvider;
	providerTransactionId: string | null;
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

/** The checkout this checkpoint is waiting on, if there is one. */
export const pendingCheckout = (checkpointId: string) =>
	prisma.payment.findFirst({
		where: {
			payableType: PayableType.CHECKPOINT,
			payableId: checkpointId,
			status: PaymentStatus.PENDING,
		},
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			payableId: true,
			provider: true,
			providerTransactionId: true,
		},
	});

/**
 * A Paddle refund for a checkpoint payment, from the webhook: ours, written
 * already when the admin issued it, or one made in the Paddle dashboard. Paddle
 * approves refunds itself: one it rejects is logged for an admin to settle by
 * hand, the row the admin's refund wrote is kept, and one still waiting for
 * approval changes nothing yet.
 */
export const recordPaddleAdjustment = async (
	payment: { id: string; amount: number; payableId: string },
	adjustment: {
		id: string;
		status: string;
		amount: number | null;
		currency: string;
	},
) => {
	if (adjustment.status === "rejected" || adjustment.status === "reversed") {
		console.error(
			"[paddle.refund] Paddle did not refund",
			adjustment.id,
			adjustment.status,
		);
		await prisma.auditLog.create({
			data: {
				entity: "checkpoint",
				entityId: payment.payableId,
				action: AuditAction.UPDATE,
				meta: {
					action: "paddleRefundRefused",
					adjustmentId: adjustment.id,
					status: adjustment.status,
				},
			},
		});

		return;
	}

	if (adjustment.status !== "approved") return;

	const refund = {
		id: adjustment.id,
		amount: adjustment.amount ?? payment.amount,
		currency: adjustment.currency,
		reason: "paddleRefund",
	};
	// What earlier refunds returned, plus this one: a repeat of it is not counted twice.
	const earlier = await prisma.refund.findMany({
		where: { paymentId: payment.id, providerRefundId: { not: adjustment.id } },
		select: { amount: true },
	});

	await recordProviderRefund(
		payment,
		refund,
		refundedTotal(earlier) + refund.amount >= payment.amount,
	);
};
