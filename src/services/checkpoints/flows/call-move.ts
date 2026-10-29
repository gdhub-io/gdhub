import { lockCurator } from "@/repositories/advisor/availability";
import {
	clearRequest,
	isOneOf,
	movable,
	otherSide,
	refuse,
	slotsFor,
} from "@/repositories/checkpoints/call-move";
import { notifyCallMove } from "@/services/checkpoints/notifications";
import { prisma } from "@/services/prisma";

/** One side asks for a free hour; asking again replaces their own request. */
export const askCallMove = async (
	checkpointId: string,
	index: number,
	userId: string,
	moveTo: Date,
	now = new Date(),
) => {
	const { session, side, curatorId, startedAt, refused } = await movable(
		checkpointId,
		index,
		userId,
		now,
	);
	if (refused) return refused;
	if (session.moveAskedById && session.moveAskedById !== userId) {
		return refuse("pendingFromOther");
	}

	const { slots } = await slotsFor(session, curatorId, startedAt, now);
	if (!isOneOf(slots, moveTo)) return refuse("slotTaken");

	await prisma.checkpointSession.update({
		where: { id: session.id },
		data: { moveTo, moveAskedById: userId, moveAskedAt: now },
	});
	await notifyCallMove(session.id, otherSide(side), {
		event: "asked",
		moveTo,
	});
	return { ok: true as const };
};

/**
 * The other side answers. Approving checks the hour again under the curator's
 * lock — it may have been taken since — and moves only this call.
 */
export const answerCallMove = async (
	checkpointId: string,
	index: number,
	userId: string,
	approve: boolean,
	now = new Date(),
) => {
	const { session, side, curatorId, startedAt, refused } = await movable(
		checkpointId,
		index,
		userId,
		now,
	);
	if (refused) return refused;
	const { moveTo, moveAskedById } = session;
	if (!moveTo || !moveAskedById) return refuse("nothingAsked");
	if (moveAskedById === userId) return refuse("notAllowed");
	const asker = otherSide(side);

	if (!approve) {
		await prisma.checkpointSession.update({
			where: { id: session.id },
			data: clearRequest,
		});
		await notifyCallMove(session.id, asker, { event: "declined", moveTo });
		return { ok: true as const };
	}

	const moved = await prisma.$transaction(async (tx) => {
		await lockCurator(tx, curatorId);
		const { slots } = await slotsFor(session, curatorId, startedAt, now, tx);
		const free = isOneOf(slots, moveTo);
		await tx.checkpointSession.update({
			where: { id: session.id },
			data: free
				? { ...clearRequest, scheduledAt: moveTo, rescheduledAt: now }
				: clearRequest,
		});
		return free;
	});
	if (!moved) return refuse("slotTaken");

	await notifyCallMove(session.id, asker, { event: "approved", moveTo });
	return { ok: true as const };
};
