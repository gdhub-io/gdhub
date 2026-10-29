import {
	AuditAction,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	PayableType,
	PaymentProvider,
	PaymentStatus,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import { after } from "next/server";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_CURRENCY,
	CHECKPOINT_DAYS,
	CHECKPOINT_MAX_TEAM,
	EXPERT_CHECKPOINT_OPEN,
	CHECKPOINT_MINOR_UNITS as MINOR,
} from "@/config/checkpoint";
import { type CuratorLevel, curatorPrice } from "@/config/checkpoint-pricing";
import { checkpointMove } from "@/lib/checkpoints/status";
import { isFirstCallFree } from "@/repositories/advisor/availability";
import { curatorEligibleWhere } from "@/repositories/checkpoints/curator-catalog";
import { refundedTotal } from "@/repositories/checkpoints/refund";
import { recordProviderRefund } from "@/repositories/payments/records";
import { CONFIRMED_MEMBERS } from "@/repositories/project/team";
import { prisma } from "@/services/prisma";
/** The money a checkpoint holds or has taken. */
export const heldPaymentWhere = (checkpointId: string) => ({
	payableType: PayableType.CHECKPOINT,
	payableId: checkpointId,
	status: { in: [PaymentStatus.PROCESSING, PaymentStatus.COMPLETED] },
});

/** The payment that bought this checkpoint, whatever state it is in now. */
export const completedPaymentOf = async (checkpointId: string) =>
	(
		await prisma.payment.findFirst({
			where: {
				payableType: PayableType.CHECKPOINT,
				payableId: checkpointId,
				status: PaymentStatus.COMPLETED,
			},
			select: { id: true },
		})
	)?.id ?? null;

export const isCheckpointPaid = async (checkpointId: string) =>
	(await completedPaymentOf(checkpointId)) !== null;

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
			? `${checkpoint.stageName} · ${CHECKPOINT_DAYS} days with the AI curator`
			: `${checkpoint.stageName} · ${CHECKPOINT_DAYS} days with ${checkpoint.curator?.name ?? "a curator"}`,
	};
};

/**
 * Hands a checkpoint back to its author after its curator said no or never
 * answered: unpaid again, with that curator kept so the picker shows them as
 * unavailable — an expert who disappears from the list is one picked again.
 *
 * Returns false when it was no longer waiting: the curator's answer won.
 */
export const returnToAuthor = (
	checkpointId: string,
	curatorId: string | null,
) =>
	prisma.$transaction(async (tx) => {
		const move = checkpointMove(
			CheckpointStatus.AwaitingCurator,
			CheckpointStatus.Draft,
		);
		const { count } = await tx.projectCheckpoint.updateMany({
			where: { id: checkpointId, ...move.where },
			data: {
				...move.data,
				curatorId: null,
				curatorDeclinedAt: new Date(),
				paymentId: null,
				startedAt: null,
				dueAt: null,
				...(curatorId && { declinedCuratorIds: { push: curatorId } }),
			},
		});
		if (!count) return false;

		// The calls were that curator's hours; the next one is booked afresh.
		await tx.checkpointSession.deleteMany({ where: { checkpointId } });
		return true;
	});

/** Runs `work` once the response is sent; outside a request (a script), right away. */
export const afterResponse = (work: () => Promise<void>) => {
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

export type PendingCheckout = {
	id: string;
	payableId: string;
	provider: PaymentProvider;
	providerTransactionId: string | null;
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

/** Closes every checkout still open for this checkpoint, records the purchase terms, and opens a new one. */
export const openCheckpointPayment = async ({
	checkpointId,
	payerId,
	acceptances,
	amount,
	currency,
	provider,
}: {
	checkpointId: string;
	payerId: string;
	acceptances: Prisma.LegalAcceptanceCreateManyInput[];
	amount: number;
	currency: string;
	provider: PaymentProvider;
}) => {
	await prisma.payment.updateMany({
		where: {
			payableType: PayableType.CHECKPOINT,
			payableId: checkpointId,
			status: PaymentStatus.PENDING,
		},
		data: { status: PaymentStatus.CANCELED },
	});

	await prisma.legalAcceptance.createMany({ data: acceptances });

	return prisma.payment.create({
		data: {
			amount,
			currency,
			status: PaymentStatus.PENDING,
			payableType: PayableType.CHECKPOINT,
			payableId: checkpointId,
			payerId,
			provider,
		},
		select: { id: true },
	});
};

export const setProviderTransaction = (
	paymentId: string,
	providerTransactionId: string,
) =>
	prisma.payment.update({
		where: { id: paymentId },
		data: { providerTransactionId },
	});

/** The money held on the author's card, not yet taken. */
export const heldCheckpointPayment = (checkpointId: string) =>
	prisma.payment.findFirst({
		where: {
			payableType: PayableType.CHECKPOINT,
			payableId: checkpointId,
			status: PaymentStatus.PROCESSING,
		},
		select: { id: true, provider: true, providerTransactionId: true },
	});

export const markPaymentCaptured = (paymentId: string) =>
	prisma.payment.update({
		where: { id: paymentId },
		data: { status: PaymentStatus.COMPLETED, completedAt: new Date() },
	});

export const markPaymentCanceled = (paymentId: string) =>
	prisma.payment.update({
		where: { id: paymentId },
		data: { status: PaymentStatus.CANCELED },
	});

/** Checkouts opened at the provider before `createdBefore` and still `PENDING`. */
export const pendingCheckoutsBefore = (createdBefore: Date) =>
	prisma.payment.findMany({
		where: {
			payableType: PayableType.CHECKPOINT,
			status: PaymentStatus.PENDING,
			providerTransactionId: { not: null },
			createdAt: { lt: createdBefore },
		},
		select: {
			id: true,
			payableId: true,
			provider: true,
			providerTransactionId: true,
		},
	});

/** Stripe holds placed before `createdBefore` that no curator answer has captured or released. */
export const staleStripeHolds = (createdBefore: Date) =>
	prisma.payment.findMany({
		where: {
			payableType: PayableType.CHECKPOINT,
			// Only Stripe holds money it has not taken; Paddle charges at once.
			provider: PaymentProvider.STRIPE,
			status: PaymentStatus.PROCESSING,
			createdAt: { lt: createdBefore },
		},
		select: { id: true, payableId: true, providerTransactionId: true },
	});

/** The checkpoint still waiting for its curator, with who that curator is. */
export const awaitingCuratorOf = (checkpointId: string) =>
	prisma.projectCheckpoint.findFirst({
		where: {
			id: checkpointId,
			status: CheckpointStatus.AwaitingCurator,
		},
		select: { curatorId: true, curator: { select: { name: true } } },
	});
