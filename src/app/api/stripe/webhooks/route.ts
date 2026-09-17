import {
	CheckpointCuratorKind,
	CheckpointStatus,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/services/prisma";
import { stripeEvent } from "@/services/stripe/server";

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

	if (event.type !== "checkout.session.completed") {
		return NextResponse.json({ received: true });
	}

	const session = event.data.object;
	const paymentId = session.metadata?.paymentId;
	const checkpointId = session.metadata?.checkpointId;

	const payment = paymentId
		? await prisma.payment.findUnique({ where: { id: paymentId } })
		: null;

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

	if (!payment || !checkpointId || payment.payableId !== checkpointId) {
		console.warn("[stripe.webhook] event for an unknown payment:", event.id);

		return NextResponse.json({ received: true });
	}

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
