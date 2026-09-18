import {
	CheckpointStatus,
	PayableType,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { dueDateFrom } from "@/lib/checkpoint-days";
import { prisma } from "@/services/prisma";
import { captureCheckout, releaseCheckout } from "@/services/stripe/server";

const AnswerSchema = z.object({ accept: z.boolean() });

/** A date already gone cannot be day one; the author's wish holds otherwise. */
const startsOn = (wanted: Date | null) => {
	const today = new Date();
	const midnight = new Date(
		Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
	);

	return wanted && wanted > midnight ? wanted : midnight;
};

/**
 * The curator answering a checkpoint that was paid for and handed to them.
 *
 * Not behind the space guard: a curator is not a member of the project they are
 * curating, so the right to answer comes from being the person named on the
 * checkpoint and from nothing else.
 *
 * Accepting is what starts the 28 days, and it is also the moment the author is
 * charged: buying the checkpoint only held the money on their card. Declining
 * lets that hold go — free, and with nothing to refund, because nothing ever
 * moved.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withValidation(AnswerSchema, "body"),
)(async (_req, ctx, { user, body }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { accept } = body as z.infer<typeof AnswerSchema>;

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id },
		select: { status: true, curatorId: true, startedAt: true },
	});

	if (!checkpoint) return apiError.notFound();
	if (checkpoint.curatorId !== curator.id) return apiError.forbidden();

	// Answering twice is not an error the curator can see the difference of, but
	// it must not restart a checkpoint that is already running.
	if (checkpoint.status !== CheckpointStatus.AwaitingCurator) {
		return apiError.badRequest("checkpointNotAwaiting");
	}

	// The held money is taken on the way in and let go on the way out. Either
	// way the row is written after Stripe has agreed, never before.
	const held = await prisma.payment.findFirst({
		where: {
			payableType: PayableType.CHECKPOINT,
			payableId: id,
			status: PaymentStatus.PROCESSING,
		},
		select: { id: true, providerTransactionId: true },
	});

	if (held?.providerTransactionId) {
		const settled = accept
			? await captureCheckout(held.providerTransactionId)
			: await releaseCheckout(held.providerTransactionId);

		if (!settled) return apiError.internal("paymentNotSettled");

		await prisma.payment.update({
			where: { id: held.id },
			data: accept
				? { status: PaymentStatus.COMPLETED, completedAt: new Date() }
				: { status: PaymentStatus.CANCELED },
		});
	}

	const startedAt = startsOn(checkpoint.startedAt);

	await prisma.projectCheckpoint.update({
		where: { id },
		data: accept
			? {
					status: CheckpointStatus.Active,
					curatorAcceptedAt: new Date(),
					startedAt,
					dueAt: dueDateFrom(startedAt),
				}
			: {
					status: CheckpointStatus.Draft,
					curatorDeclinedAt: new Date(),
					curatorId: null,
					// Kept so the picker can show them as unavailable: an expert who
					// disappears from the list is one the author picks again.
					declinedCuratorIds: { push: curator.id },
					// The hold is gone, so the checkpoint is unpaid again: the author
					// picks somebody else and buys it for them.
					paymentId: null,
				},
	});

	return json({ accepted: accept });
});
