import { PaymentProvider, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";
import { getCheckoutReceiptUrl } from "@/services/stripe/server";

const ReceiptQuerySchema = z.object({ paymentId: z.string() });

/**
 * The receipt for one of the caller's own Stripe payments.
 *
 * Scoped by `payerId` rather than by any project permission: a receipt belongs
 * to whoever paid, and nobody else may fetch one by guessing an id. Paddle
 * receipts keep their own route — they hang off the vacancy, not off the row.
 */
export const GET = pipe(
	withAuth({ mode: "user" }),
	withValidation(ReceiptQuerySchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	const payer = user as SessionUser | undefined;
	if (!payer) return apiError.unauthorized();

	const { paymentId } = body as z.infer<typeof ReceiptQuerySchema>;

	const payment = await prisma.payment.findFirst({
		where: {
			id: paymentId,
			payerId: payer.id,
			provider: PaymentProvider.STRIPE,
			// A hold already has a charge behind it, so it has a receipt too.
			status: { in: [PaymentStatus.PROCESSING, PaymentStatus.COMPLETED] },
		},
		select: { providerTransactionId: true },
	});

	if (!payment?.providerTransactionId) return apiError.notFound();

	const url = await getCheckoutReceiptUrl(payment.providerTransactionId);

	return url ? json({ url }) : apiError.notFound();
});
