import { PayableType, PaymentProvider } from "@gdhub-io/gdhub-prisma";
import { type NextRequest, NextResponse } from "next/server";
import { recordPaddleAdjustment } from "@/repositories/checkpoints/payment";
import { paymentOf, recordPaymentEvent } from "@/repositories/payments/records";
import { settleCheckpointCheckout } from "@/services/checkpoints/flows/payment";
import { paddleMinor, verifyPaddleWebhook } from "@/services/paddle/server";
import { paidOfTransaction } from "@/services/payments/paddle";
import { settleListingFee } from "@/services/vacancies/listing-fee";

export async function POST(request: NextRequest) {
	try {
		// Read the RAW body and verify the signature before trusting anything.
		const rawBody = await request.text();
		const verification = verifyPaddleWebhook(
			rawBody,
			request.headers.get("paddle-signature"),
		);
		if (!verification.ok) {
			console.warn("[paddle.webhook] signature rejected:", verification.reason);
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
		}

		const body = JSON.parse(rawBody);
		const eventType = body?.event_type;

		console.log("[paddle.webhook]", eventType);

		switch (eventType) {
			// `transaction.completed` is Paddle's final state for a paid transaction
			// (fires after `transaction.paid`) and is the recommended event for
			// fulfillment. The handler is still idempotent because Paddle retries
			// and can deliver the same event more than once.
			case "transaction.completed":
				return await handleTransactionCompleted(body);
			case "transaction.created":
				return await handleTransactionCreated(body);
			// A refund, ours or one made in the Paddle dashboard, and Paddle's
			// later approval or rejection of it.
			case "adjustment.created":
			case "adjustment.updated":
				return await handleAdjustment(body);
			default:
				console.log("[paddle.webhook] unhandled event type:", eventType);
				return NextResponse.json({ success: true });
		}
	} catch (error) {
		console.error("[paddle.webhook] error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

async function handleTransactionCompleted(body: any) {
	try {
		const data = body?.data ?? {};
		const eventId = body?.event_id;
		const transactionId = data.id;
		const paymentId = data.custom_data?.paymentId;

		const payment = paymentId
			? await paymentOf(PaymentProvider.PADDLE, { id: paymentId })
			: null;

		if (
			eventId &&
			!(await recordPaymentEvent(
				PaymentProvider.PADDLE,
				{ id: eventId, type: body.event_type, payload: body },
				payment?.id ?? null,
			))
		) {
			console.log("[paddle.webhook] duplicate event, skipping:", eventId);
			return NextResponse.json({ success: true });
		}

		if (!paymentId || !payment) {
			console.log("[paddle.webhook] no matching payment for", transactionId);
			return NextResponse.json({ success: true });
		}

		if (payment.payableType === PayableType.CHECKPOINT) {
			if (data.custom_data?.checkpointId !== payment.payableId) {
				console.warn("[paddle.webhook] checkpoint mismatch for", payment.id);
				return NextResponse.json({ success: true });
			}

			await settleCheckpointCheckout(
				payment,
				paidOfTransaction({
					id: transactionId,
					grandTotal: data.details?.totals?.grand_total,
					customerId: data.customer_id,
					invoiceId: data.invoice_id,
				}),
			);

			return NextResponse.json({ success: true });
		}

		if (payment.payableType === PayableType.VACANCY) {
			await settleListingFee(payment, {
				...paidOfTransaction({
					id: transactionId,
					grandTotal: data.details?.totals?.grand_total,
					customerId: data.customer_id,
					invoiceId: data.invoice_id,
				}),
				priceId: data.items?.[0]?.price?.id,
				currency: data.currency_code,
			});
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[paddle.webhook.transaction.completed]", error);
		throw error;
	}
}

async function handleAdjustment(body: any) {
	const data = body?.data ?? {};
	if (data.action !== "refund") return NextResponse.json({ success: true });

	const payment = data.transaction_id
		? await paymentOf(PaymentProvider.PADDLE, {
				providerTransactionId: data.transaction_id,
			})
		: null;

	const fresh = await recordPaymentEvent(
		PaymentProvider.PADDLE,
		{ id: body.event_id, type: body.event_type, payload: body },
		payment?.id ?? null,
	);

	if (fresh && payment?.payableType === PayableType.CHECKPOINT) {
		await recordPaddleAdjustment(payment, {
			id: data.id,
			status: data.status,
			amount: paddleMinor(data.totals?.total),
			currency: data.currency_code ?? payment.currency,
		});
	}

	return NextResponse.json({ success: true });
}

async function handleTransactionCreated(body: any) {
	try {
		console.log("[paddle.webhook.transaction.created]", body?.data?.id);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[paddle.webhook.transaction.created]", error);
		throw error;
	}
}
