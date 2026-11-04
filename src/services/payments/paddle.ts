import { PaymentProvider } from "@gdhub-io/gdhub-prisma";
import { ApiError, type Discount } from "@paddle/paddle-node-sdk";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_CURRENCY,
	CHECKPOINT_MINOR_UNITS,
	MIN_CHARGE_AFTER_DISCOUNT,
} from "@/config/checkpoint";
import { env } from "@/helpers/env";
import {
	getTransactionInvoiceUrl,
	paddleMinor as minor,
	paddleClient as paddle,
} from "@/services/paddle/server";
import type { PromoCodeDto } from "@/types/checkpoints";
import {
	type CheckoutPaid,
	type PaymentGateway,
	PromoCodeMissingError,
	PromoCodeRefusedError,
	PromoCodeTakenError,
} from "./types";

/**
 * Paddle, for the AI Checkpoint (GDHUB-106). Paddle is the merchant of record and
 * charges at once, so there is no hold to capture or let go.
 *
 * The checkout is a transaction made here against the catalog price, and the
 * author pays it in Paddle's overlay: what is sold, and to which `Payment` row it
 * belongs, is decided on the server rather than in the browser.
 */
export const aiPrice = () => env("PADDLE_AI_CHECKPOINT_PRICE_ID");

/** A paid Paddle transaction, as a settled checkout: Paddle charges at once. */
export const paidOfTransaction = (transaction: {
	id: string;
	grandTotal: string | null | undefined;
	customerId: string | null | undefined;
	invoiceId: string | null | undefined;
}): CheckoutPaid => {
	const amount = minor(transaction.grandTotal);

	return {
		transactionId: transaction.id,
		amount,
		customerId: transaction.customerId ?? null,
		invoiceId: transaction.invoiceId ?? null,
		charged: amount !== 0,
		held: false,
	};
};

const toDto = (discount: Discount): PromoCodeDto => ({
	id: discount.id,
	code: discount.code ?? "",
	percentOff: discount.type === "percentage" ? Number(discount.amount) : null,
	amountOff: discount.type === "flat" ? minor(discount.amount) : null,
	timesRedeemed: discount.timesUsed ?? 0,
	maxRedemptions: discount.usageLimit,
	expiresAt: discount.expiresAt,
	firstPurchaseOnly: false,
	active: discount.status === "active",
});

const promoErrors = async <T>(call: () => Promise<T>) => {
	try {
		return await call();
	} catch (error) {
		if (!(error instanceof ApiError)) throw error;
		if (error.code === "not_found" || error.code === "entity_not_found") {
			throw new PromoCodeMissingError();
		}
		if (
			/code/i.test(error.code) &&
			/exist|conflict|taken|unique/i.test(`${error.code} ${error.detail}`)
		) {
			throw new PromoCodeTakenError();
		}
		throw new PromoCodeRefusedError(error.detail);
	}
};

export const paddleGateway: PaymentGateway = {
	provider: PaymentProvider.PADDLE,

	async startCheckout(input) {
		const transaction = await paddle().transactions.create({
			items: [{ priceId: aiPrice(), quantity: 1 }],
			// What the webhook finds its way back by.
			customData: {
				paymentId: input.paymentId,
				checkpointId: input.checkpointId,
			},
		});

		return {
			transactionId: transaction.id,
			start: {
				paddleTransactionId: transaction.id,
				customerEmail: input.customerEmail,
				successUrl: input.successUrl,
			},
		};
	},

	async checkoutState(transactionId) {
		const transaction = await paddle().transactions.get(transactionId);

		if (transaction.status === "paid" || transaction.status === "completed") {
			return {
				state: "paid",
				...paidOfTransaction({
					id: transaction.id,
					grandTotal: transaction.details?.totals?.grandTotal,
					customerId: transaction.customerId,
					invoiceId: transaction.invoiceId,
				}),
			};
		}

		return { state: transaction.status === "canceled" ? "expired" : "open" };
	},

	async cancelCheckout(transactionId) {
		await paddle().transactions.update(transactionId, { status: "canceled" });
	},

	async refund(transactionId, part) {
		const transaction = await paddle().transactions.get(transactionId);
		const item = transaction.details?.lineItems[0];
		if (!item || transaction.status !== "completed") return null;

		const reason = "Checkpoint refund";
		const adjustment = await paddle().adjustments.create(
			part
				? {
						action: "refund",
						type: "partial",
						transactionId,
						reason,
						items: [
							{ itemId: item.id, type: "partial", amount: String(part.amount) },
						],
					}
				: { action: "refund", type: "full", transactionId, reason },
		);

		return {
			id: adjustment.id,
			amount: minor(adjustment.totals.total) ?? part?.amount ?? 0,
			currency: adjustment.currencyCode,
		};
	},

	receiptUrl: (transactionId) => getTransactionInvoiceUrl(transactionId),

	promoCodes: {
		firstPurchase: false,

		async list() {
			const price = aiPrice();
			const codes: PromoCodeDto[] = [];

			for await (const discount of paddle().discounts.list({ perPage: 200 })) {
				// Vacancy and any other discounts live in the same account.
				if (discount.restrictTo?.includes(price)) codes.push(toDto(discount));
			}

			return codes;
		},

		create: (input) =>
			promoErrors(async () => {
				const amountOff =
					input.kind === "amount" ? input.value * CHECKPOINT_MINOR_UNITS : null;

				// Never takes a checkpoint to zero: a free one is an admin's call (GDHUB-40).
				if (
					amountOff !== null &&
					amountOff >
						CHECKPOINT_AI_PRICE * CHECKPOINT_MINOR_UNITS -
							MIN_CHARGE_AFTER_DISCOUNT
				) {
					throw new PromoCodeRefusedError("amountTooHigh");
				}

				return toDto(
					await paddle().discounts.create({
						description: `Checkpoint promotion code ${input.code}`,
						code: input.code,
						enabledForCheckout: true,
						recur: false,
						restrictTo: [aiPrice()],
						usageLimit: input.maxRedemptions ?? null,
						expiresAt: input.expiresAt ?? null,
						...(amountOff === null
							? { type: "percentage", amount: String(input.value) }
							: {
									type: "flat",
									amount: String(amountOff),
									currencyCode: CHECKPOINT_CURRENCY,
								}),
					}),
				);
			}),

		setActive: (id, active) =>
			promoErrors(async () =>
				toDto(
					await paddle().discounts.update(id, {
						status: active ? "active" : "archived",
					}),
				),
			),
	},
};
