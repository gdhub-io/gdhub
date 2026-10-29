import { CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { utcStartOfDay } from "@/lib/checkpoints/days";
import {
	LegalAcceptancesSchema,
	LegalError,
	resolveLegal,
} from "@/lib/legal/accept";
import { legalErrorResponse, requestMeta } from "@/lib/legal/http";
import {
	curatorAnswerState,
	startAcceptedCheckpoint,
} from "@/repositories/checkpoints/checkpoint";
import {
	heldCheckpointPayment,
	markPaymentCaptured,
	returnToAuthor,
} from "@/repositories/checkpoints/payment";
import {
	latestAcceptance,
	needsAcceptance,
} from "@/repositories/legal.repository";
import {
	ensureCheckpointRoom,
	syncChat,
} from "@/services/chat/checkpoint-room";
import { returnCheckpointMoney } from "@/services/checkpoints/flows/payment";
import { notifyAuthorOfAnswer } from "@/services/checkpoints/notifications";
import { gatewayFor } from "@/services/payments/gateway";

const AnswerSchema = z.object({
	accept: z.boolean(),
	/** The Advisor Agreement, when the version in effect is not accepted yet. */
	legal: LegalAcceptancesSchema.optional(),
});

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
)(async (req, ctx, { user, body }) => {
	const curator = user as SessionUser | undefined;
	if (!curator) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { accept, legal } = body as z.infer<typeof AnswerSchema>;

	const checkpoint = await curatorAnswerState(id);

	if (!checkpoint) return apiError.notFound();
	if (checkpoint.curatorId !== curator.id) return apiError.forbidden();

	// Answering twice is not an error the curator can see the difference of, but
	// it must not restart a checkpoint that is already running.
	if (checkpoint.status !== CheckpointStatus.AwaitingCurator) {
		return apiError.badRequest("checkpointNotAwaiting");
	}

	// Refused before any money moves: curating is done under the Advisor
	// Agreement, accepted once and again after a material change.
	let acceptances: ReturnType<typeof resolveLegal> = [];
	if (
		accept &&
		needsAcceptance(
			"AdvisorAgreement",
			(await latestAcceptance(curator.id, "AdvisorAgreement"))?.version,
		)
	) {
		try {
			acceptances = resolveLegal(legal, ["AdvisorAgreement"], {
				userId: curator.id,
				context: "CuratorAccept",
				checkpointId: id,
				meta: requestMeta(req),
			});
		} catch (error) {
			if (error instanceof LegalError) return legalErrorResponse(error);
			throw error;
		}
	}

	// Accepting takes the money that is held. Turning it down gives it back —
	// released if it is still only held, refunded if it was already captured,
	// which is what a checkpoint bought before holds existed still carries.
	const held = await heldCheckpointPayment(id);

	if (accept) {
		if (held?.providerTransactionId) {
			// Only a provider that holds money can capture it; Paddle has already taken it.
			const { capture } = gatewayFor(held.provider);
			const captured = capture
				? await capture(held.providerTransactionId)
				: true;

			if (!captured) return apiError.internal("paymentNotSettled");

			await markPaymentCaptured(held.id);
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
		const count = await startAcceptedCheckpoint(id, startedAt, acceptances);
		// Stripe will not both capture a hold and let it go, so only a decline
		// racing this one gets here.
		if (!count) {
			console.error(`[checkpoint] ${id} stopped waiting while accepted`);
			return apiError.badRequest("checkpointNotAwaiting");
		}
	} else if (!(await returnToAuthor(id, curator.id))) {
		// The silence cron handed it back first and has told the author already.
		return json({ accepted: false });
	}

	// The chat opens as the checkpoint starts, and the curator's yes is what
	// starts it. The first click on the chat makes the room if this could not.
	if (accept) {
		await syncChat(`start ${id}`, () => ensureCheckpointRoom(id));
	}

	await notifyAuthorOfAnswer(
		id,
		curator.name ?? "",
		accept ? "accepted" : "declined",
	);

	return json({ accepted: accept });
});
