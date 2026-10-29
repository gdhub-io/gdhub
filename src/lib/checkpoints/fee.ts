import {
	CheckpointCuratorKind,
	CheckpointFeeReason,
} from "@/config/prisma-enums";
import { curatorFee } from "@/lib/checkpoints/costs";
import type { RefundRowReason } from "@/lib/checkpoints/refund";

export type FeeCase = {
	curatorKind: CheckpointCuratorKind;
	curatorId: string | null;
	decidedById: string | null;
	verdictSent: boolean;
	/** Minor units actually charged, after any promotion code. */
	paid: number;
	refundReason: RefundRowReason | null;
	sessions: { index: number; curatorJoinedAt: Date | string | null }[];
	/** The first call the current curator holds, when an admin put them in. */
	tookOverAt: number | null;
};

/** Refunds after which the curator earns nothing (Advisor Agreement §7.4). */
const STOPPED: RefundRowReason[] = [
	"curatorGone",
	"noVerdict",
	"checkpointCancelled",
	"curatorDeclined",
];

/**
 * What the current curator earned, or null for nothing: the AI, a curator who
 * stopped, one whose verdict an administrator wrote. A replacement earns the
 * calls from the one they took over and the verdict.
 */
export const feeFor = (fee: FeeCase) => {
	if (fee.curatorKind !== CheckpointCuratorKind.Human || !fee.curatorId) {
		return null;
	}
	if (fee.refundReason && STOPPED.includes(fee.refundReason)) return null;
	const ownVerdict = fee.verdictSent && fee.decidedById === fee.curatorId;
	if (fee.verdictSent && !ownVerdict) return null;

	const from = fee.tookOverAt ?? 1;
	const held = fee.sessions.filter(
		(session) => session.index >= from && session.curatorJoinedAt,
	).length;
	const parts = held + (ownVerdict ? 1 : 0);
	if (!parts) return null;

	return {
		curatorId: fee.curatorId,
		parts,
		amount: curatorFee(fee.paid, parts),
		reason: fee.tookOverAt
			? CheckpointFeeReason.Replacement
			: fee.refundReason
				? CheckpointFeeReason.RefundReduced
				: CheckpointFeeReason.Full,
	};
};

export type NoFeeReason = "stopped" | "adminVerdict";

/** Why a finished human checkpoint pays its curator nothing. */
export const noFeeReason = ({
	decidedById,
	curatorId,
}: {
	decidedById: string | null;
	curatorId: string | null;
}): NoFeeReason =>
	decidedById && decidedById !== curatorId ? "adminVerdict" : "stopped";
