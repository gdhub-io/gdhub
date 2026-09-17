import {
	CheckpointCuratorKind,
	CheckpointStatus,
	PayableType,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import {
	CHECKPOINT_AI_PRICE,
	CURATOR_LEVELS,
	type CuratorLevel,
	curatorPrice,
} from "@/config/checkpoint-pricing";
import { prisma } from "@/services/prisma";

/** Prices are written in whole units; Stripe and `Payment.amount` want minor ones. */
const MINOR = 100;

/** The screen writes a `$`, so this is what is charged and what the row stores. */
export const CHECKPOINT_CURRENCY = "USD";

/**
 * Why a checkpoint cannot be paid for. Each one is a state the author can see
 * and fix, so the route answers with the reason rather than a bare 400.
 */
export type CheckoutRefusal =
	| "notFound"
	| "checkpointNotDraft"
	| "alreadyPaid"
	| "termsNotAccepted"
	| "curatorUnavailable";

/** Whether this checkpoint has been paid for, whatever state it is in now. */
export const isCheckpointPaid = async (checkpointId: string) =>
	(await prisma.payment.count({
		where: {
			payableType: PayableType.CHECKPOINT,
			payableId: checkpointId,
			status: PaymentStatus.COMPLETED,
		},
	})) > 0;

/**
 * What a checkout for this checkpoint would charge, and for what.
 *
 * The price is computed here and never taken from the client: the screen shows
 * the same number because it runs the same table, not because it is trusted to
 * send it. A human curator's level is read off their speciality at this moment —
 * someone who has since stopped taking mentees cannot be bought.
 */
export const checkpointCheckout = async (checkpointId: string) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			id: true,
			order: true,
			stageName: true,
			status: true,
			curatorKind: true,
			curatorId: true,
			acceptedTermsAt: true,
			curator: { select: { name: true } },
			project: { select: { slug: true, name: true } },
		},
	});

	if (!checkpoint) return { ok: false as const, reason: "notFound" as const };

	if (checkpoint.status !== CheckpointStatus.Draft) {
		return { ok: false as const, reason: "checkpointNotDraft" as const };
	}

	// A checkpoint a curator declined goes back to Draft with the money already
	// paid. Picking someone else must not charge for it twice.
	if (await isCheckpointPaid(checkpointId)) {
		return { ok: false as const, reason: "alreadyPaid" as const };
	}

	// The checkbox is the agreement, and the server is where that holds: a client
	// that hides it still cannot open a checkout.
	if (!checkpoint.acceptedTermsAt) {
		return { ok: false as const, reason: "termsNotAccepted" as const };
	}

	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const speciality = isAI
		? null
		: await prisma.speciality.findFirst({
				where: {
					userId: checkpoint.curatorId ?? "",
					isOpenForMentoring: true,
					level: { in: CURATOR_LEVELS },
				},
				select: { level: true },
			});

	if (!isAI && !speciality) {
		return { ok: false as const, reason: "curatorUnavailable" as const };
	}

	const price = speciality
		? curatorPrice(speciality.level as CuratorLevel)
		: CHECKPOINT_AI_PRICE;

	return {
		ok: true as const,
		checkpoint,
		amount: price * MINOR,
		currency: CHECKPOINT_CURRENCY,
		name: `${checkpoint.project.name} — checkpoint ${checkpoint.order}`,
		description: isAI
			? `${checkpoint.stageName} · 28 days with the AI curator`
			: `${checkpoint.stageName} · 28 days with ${checkpoint.curator?.name ?? "a curator"}`,
	};
};
