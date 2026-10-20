import dayjs from "dayjs";
import {
	CHECKPOINT_PARTS,
	CHECKPOINT_RUNNING_STATUSES,
	FINAL_SESSION,
	WITHDRAWAL_DAYS,
} from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
	type CheckpointStatus,
} from "@/config/prisma-enums";
import { verdictOverdue } from "@/lib/checkpoint-verdict-window";

/**
 * What a checkpoint owes back, worked out from what was paid and what was
 * delivered. Browser-safe: the admin's dialog and the server run the same sums.
 */

/** Why an administrator returns money on a running checkpoint. */
export const REFUND_REASONS = [
	"withdrawal",
	"curatorGone",
	"noVerdict",
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

/**
 * Every reason a `Refund` row carries: the admin's three, the calls an admin's
 * verdict refunds, the two the app returns money for on its own, and one issued
 * by hand in the Stripe dashboard.
 */
export type RefundRowReason =
	| RefundReason
	| "missedCalls"
	| "checkpointCancelled"
	| "curatorDeclined"
	| "stripeRefund";

export type RefundCase = {
	curatorKind: CheckpointCuratorKind;
	status: CheckpointStatus;
	/** Minor units actually charged, after any promotion code. */
	paid: number;
	paidAt: Date;
	dueAt: Date | null;
	verdictSent: boolean;
	sessions: {
		index: number;
		curatorJoinedAt: Date | null;
		contentStatus: CheckpointSessionContentStatus | null;
	}[];
};

export const isRunning = (status: CheckpointStatus) =>
	CHECKPOINT_RUNNING_STATUSES.includes(status);

/**
 * Parts already delivered. A call counts once the curator joined it; an AI
 * review once it is written — the final one comes with the verdict, so only
 * the reviews before it count on their own.
 */
export const providedParts = (refund: RefundCase) => {
	const delivered =
		refund.curatorKind === CheckpointCuratorKind.AI
			? refund.sessions.filter(
					(session) =>
						session.index > 1 &&
						session.index < FINAL_SESSION &&
						session.contentStatus === CheckpointSessionContentStatus.Ready,
				).length
			: refund.sessions.filter((session) => session.curatorJoinedAt).length;

	return Math.min(
		delivered + (refund.verdictSent ? 1 : 0),
		CHECKPOINT_PARTS[refund.curatorKind],
	);
};

/** Rounded in the author's favour: what is kept is rounded down, never the refund. */
export const refundAmount = (refund: RefundCase) => {
	const parts = CHECKPOINT_PARTS[refund.curatorKind];
	const provided = providedParts(refund);
	const kept = Math.floor((refund.paid * provided) / parts);

	return {
		parts,
		provided,
		part: Math.floor(refund.paid / parts),
		refund: refund.paid - kept,
	};
};

/** Why a reason does not apply to this checkpoint, or null when it does. */
export const reasonRefused = (
	refund: RefundCase,
	reason: RefundReason,
	now = new Date(),
):
	| "withdrawalOver"
	| "notHuman"
	| "notRunning"
	| "verdictNotOverdue"
	| null => {
	if (!isRunning(refund.status)) return "notRunning";

	switch (reason) {
		case "withdrawal":
			return now > dayjs(refund.paidAt).add(WITHDRAWAL_DAYS, "day").toDate()
				? "withdrawalOver"
				: null;
		case "curatorGone":
			return refund.curatorKind === CheckpointCuratorKind.Human
				? null
				: "notHuman";
		case "noVerdict":
			return !refund.verdictSent &&
				refund.dueAt &&
				verdictOverdue(refund.dueAt, now)
				? null
				: "verdictNotOverdue";
	}
};
