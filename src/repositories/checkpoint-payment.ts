import {
	CheckpointCuratorKind,
	CheckpointStatus,
	PayableType,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import type Stripe from "stripe";
import {
	CHECKPOINT_AI_PRICE,
	CURATOR_LEVELS,
	type CuratorLevel,
	curatorPrice,
} from "@/config/checkpoint-pricing";
import { prisma } from "@/services/prisma";
import {
	refundCheckout,
	releaseCheckout,
	retrieveCheckout,
} from "@/services/stripe/server";

/** Prices are written in whole units; Stripe and `Payment.amount` want minor ones. */
const MINOR = 100;

/** The screen writes a `$`, so this is what is charged and what the row stores. */
const CHECKPOINT_CURRENCY = "USD";

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
) => {
	if (kind === CheckpointCuratorKind.AI) return CHECKPOINT_AI_PRICE * MINOR;

	const speciality = await prisma.speciality.findFirst({
		where: {
			userId: curatorId ?? "",
			isOpenForMentoring: true,
			level: { in: CURATOR_LEVELS },
		},
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
			acceptedTermsAt: true,
			curator: { select: { name: true } },
			project: { select: { slug: true, name: true } },
		},
	});

	if (!checkpoint) return { ok: false as const, reason: "notFound" as const };

	if (checkpoint.status !== CheckpointStatus.Draft) {
		return { ok: false as const, reason: "checkpointNotDraft" as const };
	}

	// A checkpoint a curator declined goes back to Draft with the money already
	// paid. Picking someone else must not charge for it twice.
	if (await isCheckpointPaid(checkpointId)) {
		return { ok: false as const, reason: "alreadyPaid" as const };
	}

	// The checkbox is the agreement, and the server is where that holds: a client
	// that hides it still cannot open a checkout.
	if (!checkpoint.acceptedTermsAt) {
		return { ok: false as const, reason: "termsNotAccepted" as const };
	}

	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const amount = await curatorCharge(
		checkpoint.curatorKind,
		checkpoint.curatorId,
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
 * refunded, fee and all. Both are asked of Stripe first and written down only
 * once it agrees — a row claiming money went back when it did not is worse than
 * no row at all.
 *
 * Returns what happened, `failed` when Stripe refused, or null when there was
 * nothing to give back.
 */
export const returnCheckpointMoney = async (
	checkpointId: string,
	reason: string,
) => {
	const payment = await prisma.payment.findFirst({
		where: heldPaymentWhere(checkpointId),
		select: {
			id: true,
			amount: true,
			currency: true,
			status: true,
			providerTransactionId: true,
		},
	});

	if (!payment?.providerTransactionId) return null;

	if (payment.status === PaymentStatus.PROCESSING) {
		const released = await releaseCheckout(payment.providerTransactionId);

		if (!released) return { failed: "holdNotReleased" as const };

		await prisma.payment.update({
			where: { id: payment.id },
			data: { status: PaymentStatus.CANCELED },
		});

		return { released: true as const };
	}

	const refund = await refundCheckout(payment.providerTransactionId);

	if (!refund) return { failed: "refundFailed" as const };

	await prisma.$transaction([
		prisma.refund.create({
			data: {
				paymentId: payment.id,
				amount: refund.amount ?? payment.amount,
				currency: (refund.currency ?? payment.currency).toUpperCase(),
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
	prisma.projectCheckpoint.update({
		where: { id: checkpointId },
		data: {
			status: CheckpointStatus.Draft,
			curatorId: null,
			curatorDeclinedAt: new Date(),
			paymentId: null,
			...(curatorId && { declinedCuratorIds: { push: curatorId } }),
		},
	});

/**
 * A completed checkout, applied: the payment becomes a hold and the checkpoint
 * goes to its curator, or starts at once with the AI one.
 *
 * The webhook and the reconciliation both land here, possibly for the same
 * purchase. Only a `PENDING` row moves, so whichever comes second finds nothing
 * to do — and a confirmation arriving late cannot turn a captured or released
 * payment back into a hold.
 *
 * Returns whether this call was the one that applied it.
 */
export const settleCheckpointCheckout = async (
	payment: { id: string; payableId: string },
	session: Stripe.Checkout.Session,
) => {
	const { count } = await prisma.payment.updateMany({
		where: { id: payment.id, status: PaymentStatus.PENDING },
		data: {
			status: PaymentStatus.PROCESSING,
			providerTransactionId: session.id,
			providerCustomerId:
				typeof session.customer === "string" ? session.customer : null,
		},
	});

	if (!count) return false;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: payment.payableId },
		select: { status: true, curatorKind: true },
	});

	// A checkpoint deleted in the meantime keeps its hold as PROCESSING, and the
	// holds cron lets it go like any other nobody answered for.
	if (checkpoint?.status !== CheckpointStatus.Draft) return true;

	await prisma.projectCheckpoint.update({
		where: { id: payment.payableId },
		data: {
			status:
				checkpoint.curatorKind === CheckpointCuratorKind.AI
					? CheckpointStatus.Active
					: CheckpointStatus.AwaitingCurator,
			paymentId: payment.id,
		},
	});

	return true;
};

type PendingCheckout = {
	id: string;
	payableId: string;
	providerTransactionId: string | null;
};

/**
 * Asks Stripe what became of a checkout still `PENDING` here, and applies the
 * answer. A webhook that never arrived — not forwarded, misconfigured, failed
 * past its retries — would otherwise leave money held on a card for a
 * checkpoint that still reads as unpaid.
 */
export const reconcileCheckout = async (payment: PendingCheckout) => {
	if (!payment.providerTransactionId) return false;

	const session = await retrieveCheckout(payment.providerTransactionId);

	if (session.status === "complete") {
		return settleCheckpointCheckout(payment, session);
	}

	if (session.status === "expired") {
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
			provider: PaymentProvider.STRIPE,
			status: PaymentStatus.PENDING,
		},
		orderBy: { createdAt: "desc" },
		select: { id: true, payableId: true, providerTransactionId: true },
	});
