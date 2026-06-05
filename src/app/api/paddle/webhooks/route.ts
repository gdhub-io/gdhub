import { type NextRequest, NextResponse } from "next/server";

import { prisma } from "@/services/prisma";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
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
		const transactionId = body?.data?.id;
		const customData = body?.data?.custom_data;

		if (!customData?.paymentId) {
			console.log(
				"[paddle.webhook] no paymentId in custom_data",
				transactionId,
			);
			return NextResponse.json({ success: true });
		}

		const payment = await prisma.payment.findUnique({
			where: { id: customData.paymentId },
		});

		if (!payment) {
			console.log("[paddle.webhook] payment not found:", customData.paymentId);
			return NextResponse.json({ success: true });
		}

		// Paddle sends both `transaction.paid` and `transaction.completed` for the
		// same transaction. Gate on an atomic conditional update so only the first
		// event that wins flips PENDING → COMPLETED; concurrent duplicates match 0
		// rows and skip the side effects (publishing) entirely. Exactly-once.
		const { count } = await prisma.payment.updateMany({
			where: { id: payment.id, status: { not: "COMPLETED" as any } },
			data: {
				status: "COMPLETED" as any,
				paddleTransactionId: transactionId,
				completedAt: new Date(),
			},
		});

		if (count === 0) {
			// Already completed by the sibling event — nothing more to do.
			return NextResponse.json({ success: true });
		}

		console.log("[paddle.webhook] payment completed:", payment.id);

		// Publish the vacancy now that its listing fee is settled.
		if (payment.payableType === "VACANCY") {
			await prisma.teamVacancy.update({
				where: { id: payment.payableId },
				data: {
					status: "Published" as any,
					publishedAt: new Date(),
				},
			});

			console.log("[paddle.webhook] vacancy published:", payment.payableId);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[paddle.webhook.transaction.paid]", error);
		throw error;
	}
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
