import {
	CheckpointStatus,
	PayableType,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { apiError, json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";
import { refundCheckout } from "@/services/stripe/server";

/** The two states a checkpoint can be called off from; a running one cannot. */
const CANCELLABLE: CheckpointStatus[] = [
	CheckpointStatus.Draft,
	CheckpointStatus.AwaitingCurator,
];

/**
 * Calling off a checkpoint that has not started, and returning the money if
 * there was any.
 *
 * Only before day one. Once the 28 days run the author has had consultations
 * and a curator has spent time, and what is owed back is a conversation rather
 * than a button.
 *
 * The refund is asked of Stripe first and written down second: a row saying
 * `REFUNDED` that Stripe never agreed to would be a lie in our own records.
 *
 * The checkpoint is then deleted rather than kept as `Cancelled`: it never ran,
 * there is nothing to look back at, and a row in the project's history saying a
 * purchase was undone is noise. The payment and its refund stay — the money
 * moved, and that is the part worth keeping.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true },
	});

	if (!checkpoint) return apiError.notFound();
	if (!CANCELLABLE.includes(checkpoint.status)) {
		return apiError.badRequest("checkpointRunning");
	}

	const payment = await prisma.payment.findFirst({
		where: {
			payableType: PayableType.CHECKPOINT,
			payableId: id,
			status: PaymentStatus.COMPLETED,
		},
		select: {
			id: true,
			amount: true,
			currency: true,
			providerTransactionId: true,
		},
	});

	if (payment?.providerTransactionId) {
		const refund = await refundCheckout(payment.providerTransactionId);

		if (!refund) return apiError.internal("refundFailed");

		await prisma.$transaction([
			prisma.refund.create({
				data: {
					paymentId: payment.id,
					amount: refund.amount ?? payment.amount,
					currency: (refund.currency ?? payment.currency).toUpperCase(),
					reason: "checkpointCancelled",
					providerRefundId: refund.id,
				},
			}),
			prisma.payment.update({
				where: { id: payment.id },
				data: { status: PaymentStatus.REFUNDED },
			}),
		]);
	}

	await prisma.projectCheckpoint.delete({ where: { id } });

	return json({ refunded: !!payment });
});
