import type { PaymentProvider } from "@gdhub-io/gdhub-prisma";
import type { NewPromoCode, PromoCodeDto } from "@/types/checkpoints";

// What the checkpoint code asks of whoever takes the money. The adapters hold
// secret keys, so only the types here may reach a client component.

export type CheckpointCheckoutInput = {
	/** Our own `Payment` row, handed back by the provider as the only link. */
	paymentId: string;
	checkpointId: string;
	/** Minor units, the way `Payment.amount` stores it. */
	amount: number;
	currency: string;
	name: string;
	description: string;
	customerEmail?: string;
	successUrl: string;
	cancelUrl: string;
};

/** Where the author goes to pay: a hosted page, or Paddle's overlay over ours. */
export type CheckoutStart =
	| { url: string }
	| {
			paddleTransactionId: string;
			customerEmail?: string;
			successUrl: string;
	  };

/** A finished checkout, in the terms `settleCheckpointCheckout` needs. */
export type CheckoutPaid = {
	transactionId: string;
	/** Charged after any promotion code, minor units; null when unknown. */
	amount: number | null;
	customerId: string | null;
	invoiceId?: string | null;
	/** False when a code took it to zero and nothing was charged. */
	charged: boolean;
	/** True when the money is only authorised and still has to be captured. */
	held: boolean;
};

export type CheckoutState =
	| { state: "open" }
	| { state: "expired" }
	| ({ state: "paid" } & CheckoutPaid);

export type ProviderRefund = { id: string; amount: number; currency: string };

export type PaymentGateway = {
	provider: PaymentProvider;
	startCheckout(
		input: CheckpointCheckoutInput,
	): Promise<{ transactionId: string; start: CheckoutStart }>;
	checkoutState(transactionId: string): Promise<CheckoutState>;
	/** Closes a checkout nobody is going to finish, so it cannot be paid later. */
	cancelCheckout(transactionId: string): Promise<void>;
	/** In full, or `amount` of it; null when there was nothing charged to return. */
	refund(
		transactionId: string,
		part?: { amount: number; idempotencyKey: string },
	): Promise<ProviderRefund | null>;
	receiptUrl(transactionId: string): Promise<string | null>;
	/** A hold, taken or let go. Stripe only: Paddle charges at once. */
	capture?(transactionId: string): Promise<unknown>;
	release?(transactionId: string): Promise<unknown>;
	promoCodes: {
		/** Paddle has no "first purchase" restriction. */
		firstPurchase: boolean;
		list(): Promise<PromoCodeDto[]>;
		create(input: NewPromoCode): Promise<PromoCodeDto>;
		setActive(id: string, active: boolean): Promise<PromoCodeDto>;
	};
};

/** Another code, active or not, already has this one. */
export class PromoCodeTakenError extends Error {}
/** No code has this id. */
export class PromoCodeMissingError extends Error {}
/** The provider refused the change, e.g. switching an expired code back on. */
export class PromoCodeRefusedError extends Error {}
