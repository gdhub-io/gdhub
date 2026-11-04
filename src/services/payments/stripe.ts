import { PaymentProvider } from "@gdhub-io/gdhub-prisma";
import type Stripe from "stripe";
import {
	createPromoCode,
	isCodeTakenError,
	isInvalidRequestError,
	isMissingResourceError,
	listPromoCodes,
	setPromoCodeActive,
} from "@/services/stripe/promo-codes";
import {
	captureCheckout,
	createCheckpointCheckout,
	expireCheckout,
	getCheckoutReceiptUrl,
	refundCheckout,
	releaseCheckout,
	retrieveCheckout,
} from "@/services/stripe/server";
import {
	type CheckoutPaid,
	type PaymentGateway,
	PromoCodeMissingError,
	PromoCodeRefusedError,
	PromoCodeTakenError,
} from "./types";

/** A completed Stripe session, as a settled checkout: the card is only authorised. */
export const paidOfSession = (
	session: Stripe.Checkout.Session,
): CheckoutPaid => ({
	transactionId: session.id,
	amount: session.amount_total,
	customerId: typeof session.customer === "string" ? session.customer : null,
	// A 100% code made in the dashboard leaves no payment intent behind.
	charged: !!session.payment_intent,
	held: true,
});

const promoErrors = async <T>(call: () => Promise<T>) => {
	try {
		return await call();
	} catch (error) {
		if (isCodeTakenError(error)) throw new PromoCodeTakenError();
		if (isMissingResourceError(error)) throw new PromoCodeMissingError();
		if (isInvalidRequestError(error)) throw new PromoCodeRefusedError();
		throw error;
	}
};

export const stripeGateway: PaymentGateway = {
	provider: PaymentProvider.STRIPE,

	async startCheckout(input) {
		const session = await createCheckpointCheckout(input);
		if (!session.url) throw new Error("Stripe returned no checkout URL");

		return { transactionId: session.id, start: { url: session.url } };
	},

	async checkoutState(transactionId) {
		const session = await retrieveCheckout(transactionId);

		if (session.status === "complete") {
			return { state: "paid", ...paidOfSession(session) };
		}

		return { state: session.status === "expired" ? "expired" : "open" };
	},

	async cancelCheckout(transactionId) {
		await expireCheckout(transactionId);
	},

	async refund(transactionId, part) {
		const refund = await refundCheckout(transactionId, part);

		return refund
			? {
					id: refund.id,
					amount: refund.amount,
					currency: refund.currency.toUpperCase(),
				}
			: null;
	},

	receiptUrl: (transactionId) => getCheckoutReceiptUrl(transactionId),
	capture: (transactionId) => captureCheckout(transactionId),
	release: (transactionId) => releaseCheckout(transactionId),

	promoCodes: {
		firstPurchase: true,
		list: () => listPromoCodes(),
		create: (input) => promoErrors(() => createPromoCode(input)),
		setActive: (id, active) =>
			promoErrors(() => setPromoCodeActive(id, active)),
	},
};
