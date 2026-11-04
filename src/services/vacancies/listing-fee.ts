import {
	PayableType,
	PaymentStatus,
	TeamVacancyStatus,
} from "@gdhub-io/gdhub-prisma";
import { LISTING_FEE_EUR } from "@/config/vacancy";
import { refundedTotal } from "@/repositories/checkpoints/refund";
import { writeProviderRefund } from "@/repositories/payments/records";
import { NovuService } from "@/services/novu";
import { paddleClient } from "@/services/paddle/server";
import { paddleGateway } from "@/services/payments/paddle";
import type { CheckoutPaid } from "@/services/payments/types";
import { prisma } from "@/services/prisma";

/**
 * The listing fee of a vacancy with a price (GDHUB-128). Like a checkpoint, the
 * Paddle transaction is made here, so the app can ask Paddle what became of it
 * when the webhook does not arrive: lost, misconfigured, or a local stand no
 * tunnel reaches.
 */

// Stored when the PENDING payment is made; the paid transaction's total replaces it.
const LISTING_FEE_CENTS = LISTING_FEE_EUR * 100;

export const listingFeePriceId = () =>
	process.env.NEXT_PUBLIC_PADDLE_VACANCY_PRICE_ID || null;

const latestFee = (vacancyId: string) =>
	prisma.payment.findFirst({
		where: { payableType: PayableType.VACANCY, payableId: vacancyId },
		orderBy: { createdAt: "desc" },
	});

/** The vacancy's fee, made once and reused, so repeated saves don't pile up rows. */
export const ensureListingFee = async (vacancyId: string, payerId: string) => {
	const existing = await latestFee(vacancyId);

	return existing
		? prisma.payment.update({
				where: { id: existing.id },
				data: { payerId, providerPriceId: listingFeePriceId() },
			})
		: prisma.payment.create({
				data: {
					amount: LISTING_FEE_CENTS,
					currency: "EUR",
					status: PaymentStatus.PENDING,
					payableType: PayableType.VACANCY,
					payableId: vacancyId,
					payerId,
					providerPriceId: listingFeePriceId(),
				},
			});
};

/**
 * The Paddle transaction the author pays in the overlay: the open one, or a new
 * one. Null when no vacancy price is configured.
 */
export const startListingFeeCheckout = async (
	vacancyId: string,
	payerId: string,
) => {
	const price = listingFeePriceId();
	if (!price) return null;

	const fee = await ensureListingFee(vacancyId, payerId);
	if (fee.status === PaymentStatus.COMPLETED) return null;

	if (fee.providerTransactionId) {
		const state = await paddleGateway.checkoutState(fee.providerTransactionId);
		if (state.state === "open") return fee.providerTransactionId;
		if (state.state === "paid") {
			await settleListingFee(fee, state);
			return null;
		}
	}

	const transaction = await paddleClient().transactions.create({
		items: [{ priceId: price, quantity: 1 }],
		// What the webhook finds its way back by.
		customData: { paymentId: fee.id, vacancyId },
	});
	await prisma.payment.update({
		where: { id: fee.id },
		data: { providerTransactionId: transaction.id },
	});

	return transaction.id;
};

/**
 * Marks the fee paid and publishes the vacancy. Only the first caller that flips
 * the payment does it, so the webhook and a reconcile racing each other publish
 * once.
 */
export const settleListingFee = async (
	payment: { id: string; payableId: string; amount: number },
	paid: CheckoutPaid & { priceId?: string | null; currency?: string | null },
) => {
	const { count } = await prisma.payment.updateMany({
		where: { id: payment.id, status: { not: PaymentStatus.COMPLETED } },
		data: {
			status: PaymentStatus.COMPLETED,
			providerTransactionId: paid.transactionId,
			providerInvoiceId: paid.invoiceId ?? undefined,
			providerCustomerId: paid.customerId ?? undefined,
			providerPriceId: paid.priceId ?? undefined,
			amount: paid.amount ?? payment.amount,
			currency: paid.currency ?? undefined,
			completedAt: new Date(),
		},
	});
	if (count === 0) return false;

	const vacancy = await prisma.teamVacancy.update({
		where: { id: payment.payableId },
		data: { status: TeamVacancyStatus.Published, publishedAt: new Date() },
		include: {
			team: { include: { project: { include: { author: true } } } },
		},
	});

	const author = vacancy.team?.project?.author;
	const projectSlug = vacancy.team?.project?.slug;
	if (author) {
		try {
			await NovuService.send({
				template: "default-message",
				to: { subscriberId: author.id, email: author.email ?? undefined },
				payload: {
					title: "Vacancy published",
					message: `Your vacancy "${vacancy.title}" is now live.`,
					redirectUrl: projectSlug
						? `${process.env.NEXT_PUBLIC_APP_URL}/user/project/${projectSlug}`
						: undefined,
				},
			});
		} catch (error) {
			console.error("[listing-fee] publish notification failed:", error);
		}
	}

	return true;
};

/** Asks Paddle about a fee still pending here and applies the answer. */
export const reconcileListingFee = async (vacancyId: string) => {
	const fee = await latestFee(vacancyId);
	if (!fee?.providerTransactionId || fee.status === PaymentStatus.COMPLETED) {
		return fee?.status === PaymentStatus.COMPLETED;
	}

	const state = await paddleGateway.checkoutState(fee.providerTransactionId);
	if (state.state !== "paid") return false;

	await settleListingFee(fee, state);
	return true;
};

/**
 * Money back on a listing fee, from a refund or a chargeback made in Paddle: the
 * payment says so, and a listing paid back in full comes off the board.
 */
export const recordListingFeeReversal = async (
	payment: { id: string; payableId: string; amount: number },
	reversal: {
		id: string;
		kind: "refund" | "chargeback";
		status: string;
		amount: number | null;
		currency: string;
	},
) => {
	const chargeback = reversal.kind === "chargeback";
	// A chargeback is money gone whatever Paddle's later status says; a refund only once approved.
	if (!chargeback && reversal.status !== "approved") {
		if (reversal.status === "rejected" || reversal.status === "reversed") {
			console.error("[listing-fee] Paddle did not refund", reversal.id);
		}
		return;
	}

	const refund = {
		id: reversal.id,
		amount: reversal.amount ?? payment.amount,
		currency: reversal.currency,
		reason: chargeback ? "paddleChargeback" : "paddleRefund",
	};
	const earlier = await prisma.refund.findMany({
		where: { paymentId: payment.id, providerRefundId: { not: reversal.id } },
		select: { amount: true },
	});
	const whole = refundedTotal(earlier) + refund.amount >= payment.amount;

	await writeProviderRefund(payment, refund, whole);
	if (chargeback) {
		await prisma.payment.update({
			where: { id: payment.id },
			data: { status: PaymentStatus.DISPUTED },
		});
	}

	if (whole || chargeback) {
		await prisma.teamVacancy.updateMany({
			where: { id: payment.payableId, status: TeamVacancyStatus.Published },
			data: { status: TeamVacancyStatus.Closed },
		});
	}
};
