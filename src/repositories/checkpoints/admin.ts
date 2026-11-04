import {
	AuditAction,
	type CheckpointCuratorKind,
	type Prisma,
} from "@gdhub-io/gdhub-prisma";
import { refundAmount } from "@/lib/checkpoints/refund";
import { refundCaseOf } from "@/repositories/checkpoints/refund";
import { prisma } from "@/services/prisma";

/**
 * What only an administrator does to a checkpoint: write a verdict its curator
 * never sent, and put a curator on it by hand — a free checkpoint from a draft,
 * or a replacement on a running one. Each writes an audit row.
 */
export const audit = (
	adminId: string,
	checkpointId: string,
	meta: Prisma.InputJsonObject,
) => ({
	actorUserId: adminId,
	entity: "checkpoint_admin",
	entityId: checkpointId,
	action: AuditAction.UPDATE,
	meta,
});

/**
 * The refund that goes with an admin's verdict: the parts nobody delivered,
 * the admin's verdict counted as delivered — so only calls never joined.
 * Null when the checkpoint was given for free or the money already went back.
 */
export const missedCallsRefund = async (checkpointId: string) => {
	const found = await refundCaseOf(checkpointId);
	if (!found || found.payment.refunds.length) return null;

	const { parts, provided, refund } = refundAmount({
		...found.refund,
		verdictSent: true,
	});

	return { parts, provided, refund, payment: found.payment };
};

export type AssignCuratorInput = {
	kind: CheckpointCuratorKind;
	userId?: string;
	reason: string;
};

export const checkpointCuratorIdOf = async (checkpointId: string) =>
	(
		await prisma.projectCheckpoint.findUnique({
			where: { id: checkpointId },
			select: { curatorId: true },
		})
	)?.curatorId ?? null;
