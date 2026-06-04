import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/services/prisma";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const eventType = body?.event_type;

		console.log("[paddle.webhook]", eventType);

		switch (eventType) {
			case "transaction.completed":
				return await handleTransactionCompleted(body);
			case "transaction.created":
				return await handleTransactionCreated(body);
			default:
				console.log("[paddle.webhook] unknown event type:", eventType);
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
		const status = body?.data?.status;

		if (status === "completed" && customData?.paymentId) {
			const payment = await prisma.payment.findUnique({
				where: { id: customData.paymentId },
			});

			if (payment) {
				await prisma.payment.update({
					where: { id: customData.paymentId },
					data: {
						status: "COMPLETED" as any,
						paddleTransactionId: transactionId,
						completedAt: new Date(),
					},
				});

				console.log(
					"[paddle.webhook] payment completed:",
					customData.paymentId,
				);
			}
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[paddle.webhook.transaction.completed]", error);
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
