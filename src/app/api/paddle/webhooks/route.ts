import {
	PayableType,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { type NextRequest, NextResponse } from "next/server";
import { recordPaddleAdjustment } from "@/repositories/checkpoints/payment";
import { oncePerEvent, paymentOf } from "@/repositories/payments/records";
import { settleCheckpointCheckout } from "@/services/checkpoints/flows/payment";
import { paddleMinor, verifyPaddleWebhook } from "@/services/paddle/server";
import { aiPrice, paidOfTransaction } from "@/services/payments/paddle";
import { prisma } from "@/services/prisma";
import {
	listingFeePriceId,
	recordListingFeeReversal,
	settleListingFee,
} from "@/services/vacancies/listing-fee";

/** The catalog price each payable is sold at: a transaction at another price is not its payment. */
const EXPECTED_PRICE: Partial<Record<PayableType, () => string | null>> = {
	[PayableType.CHECKPOINT]: aiPrice,
	[PayableType.VACANCY]: listingFeePriceId,
};

// A checkout opened in the browser can carry our custom data with any items, so the items are checked too.
const soldAtOurPrice = (payableType: PayableType, items: unknown) => {
	const expected = EXPECTED_PRICE[payableType]?.();
	if (!expected || !Array.isArray(items) || items.length !== 1) return false;
	const [item] = items as { price?: { id?: string }; quantity?: number }[];
	return item?.price?.id === expected && item.quantity === 1;
};

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
	const data = body?.data ?? {};
	const paymentId = data.custom_data?.paymentId;
	const payment = paymentId
		? await paymentOf(PaymentProvider.PADDLE, { id: paymentId })
		: null;

	const applied = await oncePerEvent(
		PaymentProvider.PADDLE,
		{ id: body.event_id, type: body.event_type, payload: body },
		payment?.id ?? null,
		() => settleTransaction(data, payment),
	);
	if (!applied) console.log("[paddle.webhook] duplicate event:", body.event_id);

	return NextResponse.json({ success: true });
}

async function settleTransaction(
	data: any,
	payment: Awaited<ReturnType<typeof paymentOf>>,
) {
	if (!payment) {
		console.log("[paddle.webhook] no matching payment for", data.id);
		return;
	}
	if (!soldAtOurPrice(payment.payableType, data.items)) {
		console.warn("[paddle.webhook] price mismatch for", payment.id, data.id);
		return;
	}

	const paid = paidOfTransaction({
		id: data.id,
		grandTotal: data.details?.totals?.grand_total,
		customerId: data.customer_id,
		invoiceId: data.invoice_id,
	});

	if (payment.payableType === PayableType.CHECKPOINT) {
		if (data.custom_data?.checkpointId !== payment.payableId) {
			console.warn("[paddle.webhook] checkpoint mismatch for", payment.id);
			return;
		}
		await settleCheckpointCheckout(payment, paid);
		return;
	}

	if (payment.payableType === PayableType.VACANCY) {
		if (data.custom_data?.vacancyId !== payment.payableId) {
			console.warn("[paddle.webhook] vacancy mismatch for", payment.id);
			return;
		}
		await settleListingFee(payment, {
			...paid,
			priceId: data.items[0].price.id,
			currency: data.currency_code,
		});
	}
}

async function handleAdjustment(body: any) {
	const data = body?.data ?? {};
	if (data.action !== "refund" && data.action !== "chargeback") {
		return NextResponse.json({ success: true });
	}

	const payment = data.transaction_id
		? await paymentOf(PaymentProvider.PADDLE, {
				providerTransactionId: data.transaction_id,
			})
		: null;

	await oncePerEvent(
		PaymentProvider.PADDLE,
		{ id: body.event_id, type: body.event_type, payload: body },
		payment?.id ?? null,
		async () => {
			if (!payment) return;
			const reversal = {
				id: data.id,
				status: data.status,
				amount: paddleMinor(data.totals?.total),
				currency: data.currency_code ?? payment.currency,
			};

			if (payment.payableType === PayableType.VACANCY) {
				await recordListingFeeReversal(payment, {
					...reversal,
					kind: data.action,
				});
				return;
			}

			if (payment.payableType !== PayableType.CHECKPOINT) return;
			if (data.action === "chargeback") {
				console.error(
					"[paddle.webhook] chargeback on checkpoint payment",
					payment.id,
				);
				await prisma.payment.update({
					where: { id: payment.id },
					data: { status: PaymentStatus.DISPUTED },
				});
				return;
			}
			await recordPaddleAdjustment(payment, reversal);
		},
	);

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
