import { CHECKPOINT_CURRENCY } from "@/config/checkpoint";
import { feeFor } from "@/lib/checkpoint-fee";
import type { RefundRowReason } from "@/lib/checkpoint-refund";
import { refundCaseOf } from "@/repositories/checkpoint-refund";
import { prisma } from "@/services/prisma";

/** The first call the curator holds, when an admin put them in (GDHUB-40's audit row). */
const tookOverAt = async (checkpointId: string, curatorId: string) => {
	const [swap] = await prisma.auditLog.findMany({
		where: {
			entity: "checkpoint_admin",
			entityId: checkpointId,
			AND: [
				{ meta: { path: ["action"], equals: "curatorAssigned" } },
				{ meta: { path: ["toCuratorId"], equals: curatorId } },
				// A draft assignment has no session; a swap after the last call has a null one.
				{ meta: { path: ["fromSession"], gte: 1 } },
			],
		},
		orderBy: { createdAt: "desc" },
		take: 1,
		select: { meta: true },
	});
	const fromSession = (swap?.meta as { fromSession?: unknown } | undefined)
		?.fromSession;

	return typeof fromSession === "number" ? fromSession : null;
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
	const [{ checkpoint, took }, found] = await Promise.all([
		prisma.projectCheckpoint
			.findUnique({
				where: { id: checkpointId },
				select: { curatorId: true, decidedById: true, decidedAt: true },
			})
			.then(async (checkpoint) => ({
				checkpoint,
				took: checkpoint?.curatorId
					? await tookOverAt(checkpointId, checkpoint.curatorId)
					: null,
			})),
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
		tookOverAt: took,
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
