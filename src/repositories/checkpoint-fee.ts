import { CHECKPOINT_CURRENCY } from "@/config/checkpoint";
import { feeFor } from "@/lib/checkpoint-fee";
import type { RefundRowReason } from "@/lib/checkpoint-refund";
import { refundCaseOf } from "@/repositories/checkpoint-refund";
import { prisma } from "@/services/prisma";

/** The first call the curator holds, when an admin put them in (GDHUB-40's audit row). */
const tookOverAt = async (checkpointId: string, curatorId: string) => {
	const rows = await prisma.auditLog.findMany({
		where: { entity: "checkpoint_admin", entityId: checkpointId },
		orderBy: { createdAt: "desc" },
		select: { meta: true },
	});
	const swap = rows
		.map((row) => row.meta as Record<string, unknown> | null)
		.find(
			(meta) =>
				meta?.action === "curatorAssigned" &&
				meta.toCuratorId === curatorId &&
				typeof meta.fromSession === "number",
		);

	return (swap?.fromSession as number | undefined) ?? null;
};

/**
 * Writes what the curator earned once a checkpoint stops running: on their
 * verdict, or on a withdrawal refund that leaves them the calls they held.
 * Frozen: a second run finds the row and changes nothing.
 */
export const recordCheckpointFee = async (
	checkpointId: string,
	now = new Date(),
) => {
	const [checkpoint, found] = await Promise.all([
		prisma.projectCheckpoint.findUnique({
			where: { id: checkpointId },
			select: { curatorId: true, decidedById: true, decidedAt: true },
		}),
		refundCaseOf(checkpointId),
	]);
	if (!checkpoint?.curatorId || !found) return null;

	const fee = feeFor({
		curatorKind: found.refund.curatorKind,
		curatorId: checkpoint.curatorId,
		decidedById: checkpoint.decidedById,
		verdictSent: found.refund.verdictSent,
		paid: found.payment.amount,
		refundReason:
			(found.payment.refunds.at(0)?.reason as RefundRowReason | undefined) ??
			null,
		sessions: found.refund.sessions,
		tookOverAt: await tookOverAt(checkpointId, checkpoint.curatorId),
	});
	if (!fee) return null;

	return prisma.checkpointFee.upsert({
		where: {
			checkpointId_curatorId: { checkpointId, curatorId: fee.curatorId },
		},
		create: {
			checkpointId,
			...fee,
			currency: CHECKPOINT_CURRENCY,
			earnedAt: checkpoint.decidedAt ?? now,
		},
		update: {},
	});
};
