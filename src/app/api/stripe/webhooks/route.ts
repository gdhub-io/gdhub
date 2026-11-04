import { PaymentProvider } from "@gdhub-io/gdhub-prisma";
import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
	oncePerEvent,
	paymentOf,
	recordProviderRefund,
} from "@/repositories/payments/records";
import { settleCheckpointCheckout } from "@/services/checkpoints/flows/payment";
import { paidOfSession } from "@/services/payments/stripe";
import { sessionOfPaymentIntent, stripeEvent } from "@/services/stripe/server";

/** The row a completed checkout names in its metadata. */
const paymentOfSession = async (session: Stripe.Checkout.Session) => {
	const id = session.metadata?.paymentId;
	const checkpointId = session.metadata?.checkpointId;

	if (!id || !checkpointId) return null;

	const payment = await paymentOf(PaymentProvider.STRIPE, { id });

	// The session must name the checkpoint its own row is for: metadata pointing
	// at somebody else's checkpoint starts nothing.
	return payment?.payableId === checkpointId ? payment : null;
};

/** The row behind a charge, found through the session it was made for. */
const paymentOfCharge = async (charge: Stripe.Charge) => {
	const intent =
		typeof charge.payment_intent === "string"
			? charge.payment_intent
			: charge.payment_intent?.id;

	if (!intent) return null;

	const sessionId = await sessionOfPaymentIntent(intent);

	return sessionId
		? paymentOf(PaymentProvider.STRIPE, { providerTransactionId: sessionId })
		: null;
};

/**
 * A refund Stripe made, whoever asked for it.
 *
 * Our own cancel route writes its refund down as it makes it; this is for the
 * ones it did not make — a refund issued from the dashboard, which would
 * otherwise leave a returned payment reading as `COMPLETED` for ever. Writing
 * by `providerRefundId` makes the two paths meet without doubling the row.
 */
const recordRefund = (
	payment: { id: string; payableId: string },
	charge: Stripe.Charge,
) => {
	const refund = charge.refunds?.data?.[0];

	return recordProviderRefund(
		payment,
		refund
			? {
					id: refund.id,
					amount: refund.amount,
					currency: refund.currency,
					reason: refund.reason ?? "stripeRefund",
				}
			: null,
		(charge.amount_refunded ?? 0) >= charge.amount,
	);
};

/**
 * Stripe's side of a checkpoint purchase, and the only thing that may put one in
 * the queue.
 *
 * Two rules hold this together. The signature is checked before anything is
 * read, so a POST from anywhere else is noise; and every event is written to
 * `PaymentEvent` under its own id first, so the same delivery twice — Stripe
 * retries — starts one checkpoint and not two.
 */
export async function POST(request: NextRequest) {
	const raw = await request.text();
	const event = stripeEvent(raw, request.headers.get("stripe-signature"));

	if (!event) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}

	const refunding = event.type === "charge.refunded";

	if (event.type !== "checkout.session.completed" && !refunding) {
		return NextResponse.json({ received: true });
	}

	// A purchase names our payment in its metadata. A refund carries a charge
	// instead — including one issued by hand from the Stripe dashboard, which is
	// the case this exists for — so the session it belongs to has to be asked
	// for before the row can be found.
	const payment = refunding
		? await paymentOfCharge(event.data.object)
		: await paymentOfSession(event.data.object);

	// Saying "received" to a duplicate stops Stripe retrying it.
	await oncePerEvent(
		PaymentProvider.STRIPE,
		{ id: event.id, type: event.type, payload: JSON.parse(raw) },
		payment?.id ?? null,
		async () => {
			if (!payment) {
				console.warn(
					"[stripe.webhook] event for an unknown payment:",
					event.id,
				);
				return;
			}
			if (refunding) await recordRefund(payment, event.data.object);
			else
				await settleCheckpointCheckout(
					payment,
					paidOfSession(event.data.object),
				);
		},
	);

	return NextResponse.json({ received: true });
}
