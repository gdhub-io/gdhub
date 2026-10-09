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
import { dueDateFrom, utcStartOfDay } from "@/lib/checkpoint-days";
import {
	returnCheckpointMoney,
	returnToAuthor,
} from "@/repositories/checkpoint-payment";
import {
	ensureCheckpointRoom,
	syncChat,
} from "@/services/chat/checkpoint-room";
import { prisma } from "@/services/prisma";
import { captureCheckout } from "@/services/stripe/server";

const AnswerSchema = z.object({ accept: z.boolean() });

/** A date already gone cannot be day one; the author's wish holds otherwise. */
const startsOn = (wanted: Date | null) => {
	const today = utcStartOfDay(new Date());

	return wanted && wanted > today ? wanted : today;
};

// Imports the server-side Matrix SDK via ensureChatRoom — keep dynamic
export const dynamic = "force-dynamic";

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

	// Accepting takes the money that is held. Turning it down gives it back —
	// released if it is still only held, refunded if it was already captured,
	// which is what a checkpoint bought before holds existed still carries.
	const held = await prisma.payment.findFirst({
		where: {
			payableType: PayableType.CHECKPOINT,
			payableId: id,
			status: PaymentStatus.PROCESSING,
		},
		select: { id: true, providerTransactionId: true },
	});

	if (accept) {
		if (held?.providerTransactionId) {
			const captured = await captureCheckout(held.providerTransactionId);

			if (!captured) return apiError.internal("paymentNotSettled");

			await prisma.payment.update({
				where: { id: held.id },
				data: { status: PaymentStatus.COMPLETED, completedAt: new Date() },
			});
		}
	} else {
		const returned = await returnCheckpointMoney(id, "curatorDeclined");

		// Money the author paid must not be left behind a checkpoint nobody is
		// running: better to refuse the decline than to lose track of it.
		if (held && (!returned || "failed" in returned)) {
			return apiError.internal("paymentNotSettled");
		}
	}

	const startedAt = startsOn(checkpoint.startedAt);

	if (accept) {
		await prisma.projectCheckpoint.update({
			where: { id },
			data: {
				status: CheckpointStatus.Active,
				curatorAcceptedAt: new Date(),
				startedAt,
				dueAt: dueDateFrom(startedAt),
			},
		});
	} else {
		await returnToAuthor(id, curator.id);
	}

	// The chat opens as the checkpoint starts, and the curator's yes is what
	// starts it. The first click on the chat makes the room if this could not.
	if (accept) {
		await syncChat(`start ${id}`, () => ensureCheckpointRoom(id));
	}

	return json({ accepted: accept });
});
