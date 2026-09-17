import Stripe from "stripe";
import { env } from "@/helpers/env";

/**
 * Stripe, for checkpoints only — vacancy listings go through Paddle and both
 * providers stay. Server-side: the secret key is here, so nothing in this file
 * may be imported from a client component.
 *
 * The client is built on first use rather than at import, so a build without the
 * key set does not fail at module load.
 */
let client: Stripe | null = null;

const stripe = () => {
	client ??= new Stripe(env("STRIPE_SECRET_KEY"));

	return client;
};

export type CheckpointCheckout = {
	/** Our own `Payment` row, handed back by the webhook as the only link. */
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

/**
 * One checkout for one checkpoint.
 *
 * The price is built inline rather than pulled from a Stripe catalogue: it comes
 * from the curator's level and the size of the team, so there is no fixed set of
 * prices to keep in sync over there.
 */
export const createCheckpointCheckout = async (input: CheckpointCheckout) =>
	stripe().checkout.sessions.create({
		mode: "payment",
		line_items: [
			{
				quantity: 1,
				price_data: {
					currency: input.currency.toLowerCase(),
					unit_amount: input.amount,
					product_data: { name: input.name, description: input.description },
				},
			},
		],
		// The card is authorised, not charged. Capture happens when a curator
		// takes the checkpoint on; until then the money is the author's and
		// letting go of it costs nobody anything.
		payment_intent_data: { capture_method: "manual" },
		// What the webhook has to find its way back by. `client_reference_id`
		// survives in the dashboard where a human can read it; the metadata is
		// what the handler actually reads.
		client_reference_id: input.checkpointId,
		metadata: {
			paymentId: input.paymentId,
			checkpointId: input.checkpointId,
		},
		customer_email: input.customerEmail,
		success_url: input.successUrl,
		cancel_url: input.cancelUrl,
	});

/**
 * The event, or null when the signature does not hold.
 *
 * Unlike the Paddle handler this never skips verification outside production: a
 * webhook nobody checks is a way to start a paid checkpoint for free, and
 * `stripe listen` prints a signing secret for local work anyway.
 */
export const stripeEvent = (rawBody: string, signature: string | null) => {
	if (!signature) return null;

	try {
		return stripe().webhooks.constructEvent(
			rawBody,
			signature,
			env("STRIPE_WEBHOOK_SECRET"),
		);
	} catch (error) {
		console.warn("[stripe.webhook] signature rejected:", error);

		return null;
	}
};

/**
 * The receipt Stripe hosts for a completed checkout, or null when there is none
 * yet. One-off payments carry it on the charge rather than as an invoice, so the
 * session is expanded down to it.
 *
 * The URL is Stripe's own and stays valid, but it is fetched on demand rather
 * than stored: what a receipt says is their record, not ours.
 */
export const getCheckoutReceiptUrl = async (sessionId: string) => {
	const session = await stripe().checkout.sessions.retrieve(sessionId, {
		expand: ["payment_intent.latest_charge"],
	});

	const intent = session.payment_intent;
	if (!intent || typeof intent === "string") return null;

	const charge = intent.latest_charge;
	if (!charge || typeof charge === "string") return null;

	return charge.receipt_url ?? null;
};

/**
 * Refunds a completed checkout in full, or null when the session never charged.
 *
 * Stripe is the record of what was returned, so nothing is decided here: the
 * caller writes its own row only once this comes back.
 */
export const refundCheckout = async (sessionId: string) => {
	const session = await stripe().checkout.sessions.retrieve(sessionId);
	const intent =
		typeof session.payment_intent === "string"
			? session.payment_intent
			: session.payment_intent?.id;

	if (!intent) return null;

	return stripe().refunds.create({ payment_intent: intent });
};

/**
 * The checkout session a payment intent belongs to.
 *
 * `Payment.providerTransactionId` holds the session id, but refund and dispute
 * events arrive carrying the charge, so the way back has to be asked for.
 */
export const sessionOfPaymentIntent = async (intentId: string) => {
	const sessions = await stripe().checkout.sessions.list({
		payment_intent: intentId,
		limit: 1,
	});

	return sessions.data[0]?.id ?? null;
};

/** The payment intent behind a checkout, or null when the session never made one. */
const intentOfSession = async (sessionId: string) => {
	const session = await stripe().checkout.sessions.retrieve(sessionId);

	return typeof session.payment_intent === "string"
		? session.payment_intent
		: (session.payment_intent?.id ?? null);
};

/**
 * Takes the money that was authorised. This is the moment the author is
 * actually charged, and it is the curator accepting that causes it.
 */
export const captureCheckout = async (sessionId: string) => {
	const intent = await intentOfSession(sessionId);

	return intent ? stripe().paymentIntents.capture(intent) : null;
};

/**
 * Lets an authorisation go. Free, and there is nothing to refund: the money
 * never left the author's card.
 *
 * Stripe refuses to cancel an intent it has already captured, so the caller
 * decides which of the two it wants by the state of its own row rather than by
 * trying this first.
 */
export const releaseCheckout = async (sessionId: string) => {
	const intent = await intentOfSession(sessionId);

	return intent ? stripe().paymentIntents.cancel(intent) : null;
};
