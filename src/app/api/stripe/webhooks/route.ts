import {
	CheckpointCuratorKind,
	CheckpointStatus,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/services/prisma";
import { sessionOfPaymentIntent, stripeEvent } from "@/services/stripe/server";

/** The row a completed checkout names in its metadata. */
const paymentOfSession = async (session: Stripe.Checkout.Session) => {
	const id = session.metadata?.paymentId;
	const checkpointId = session.metadata?.checkpointId;

	if (!id || !checkpointId) return null;

	const payment = await prisma.payment.findUnique({ where: { id } });

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
		? prisma.payment.findUnique({ where: { providerTransactionId: sessionId } })
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
const recordRefund = async (
	payment: { id: string; amount: number; currency: string; payableId: string },
	charge: Stripe.Charge,
) => {
	const refund = charge.refunds?.data?.[0];
	const returned = charge.amount_refunded ?? 0;
	const whole = returned >= charge.amount;

	if (refund) {
		await prisma.refund.upsert({
			where: { providerRefundId: refund.id },
			create: {
				paymentId: payment.id,
				amount: refund.amount,
				currency: refund.currency.toUpperCase(),
				reason: refund.reason ?? "stripeRefund",
				providerRefundId: refund.id,
			},
			update: {},
		});
	}

	await prisma.payment.update({
		where: { id: payment.id },
		data: {
			status: whole ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
		},
	});

	// Money back on a checkpoint that never started closes it. One already
	// running is left alone: what is owed there is a conversation, and an
	// administrator is the one having it.
	if (!whole) return;

	await prisma.projectCheckpoint.updateMany({
		where: {
			id: payment.payableId,
			status: {
				in: [CheckpointStatus.Draft, CheckpointStatus.AwaitingCurator],
			},
		},
		data: { status: CheckpointStatus.Cancelled },
	});
};

/**
 * Stripe's side of a checkpoint purchase, and the only thing that may start one.
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

	try {
		await prisma.paymentEvent.create({
			data: {
				provider: PaymentProvider.STRIPE,
				eventId: event.id,
				type: event.type,
				payload: JSON.parse(raw),
				paymentId: payment?.id ?? null,
			},
		});
	} catch (error) {
		// The unique id is the guard: a duplicate lands here before any side
		// effect has run, and saying "received" stops Stripe retrying.
		if ((error as { code?: string }).code === "P2002") {
			return NextResponse.json({ received: true });
		}

		throw error;
	}

	if (!payment) {
		console.warn("[stripe.webhook] event for an unknown payment:", event.id);

		return NextResponse.json({ received: true });
	}

	if (refunding) {
		await recordRefund(payment, event.data.object);

		return NextResponse.json({ received: true });
	}

	const session = event.data.object as Stripe.Checkout.Session;
	const checkpointId = payment.payableId;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: { status: true, curatorKind: true },
	});

	if (!checkpoint) return NextResponse.json({ received: true });

	await prisma.payment.update({
		where: { id: payment.id },
		data: {
			status: PaymentStatus.COMPLETED,
			completedAt: new Date(),
			providerTransactionId: session.id,
			providerCustomerId:
				typeof session.customer === "string" ? session.customer : null,
		},
	});

	// A checkpoint that already left Draft has been started by an earlier
	// delivery of this purchase; paying twice never rewinds it.
	if (checkpoint.status !== CheckpointStatus.Draft) {
		return NextResponse.json({ received: true });
	}

	await prisma.projectCheckpoint.update({
		where: { id: checkpointId },
		data: {
			// The 28 days begin when a person takes it on. The AI curator has
			// nobody to ask, so its checkpoint starts with the payment.
			status:
				checkpoint.curatorKind === CheckpointCuratorKind.AI
					? CheckpointStatus.Active
					: CheckpointStatus.AwaitingCurator,
			paymentId: payment.id,
		},
	});

	return NextResponse.json({ received: true });
}
