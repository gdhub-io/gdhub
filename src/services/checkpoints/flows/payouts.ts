import { AuditAction, Prisma } from "@gdhub-io/gdhub-prisma";
import { CHECKPOINT_CURRENCY } from "@/config/checkpoint";
import { formatCheckpointMoney } from "@/config/checkpoint-pricing";
import { monthOf, nextMonth } from "@/lib/checkpoints/costs";
import { appUrl } from "@/lib/checkpoints/hrefs";
import { hasPayoutDetails } from "@/lib/payout-account";
import {
	alreadyPaid,
	FeesTaken,
	findPayout,
	type MarkPaidInput,
	monthLabel,
	payoutDetails,
} from "@/repositories/checkpoints/payouts";
import { notify } from "@/services/checkpoints/notifications";
import { prisma } from "@/services/prisma";

/**
 * Records a bank transfer for one curator's month. The amount is the month's
 * unpaid fees as the server reads them, never a number the browser sent.
 */
export const markPayoutPaid = async (
	adminId: string,
	{ curatorId, month, paidOn, reference, detailsSeenAt }: MarkPaidInput,
	now = new Date(),
) => {
	if (monthOf(now) <= month) {
		return { ok: false as const, error: "notDue" as const };
	}

	const [profile, fees, curator, existing] = await Promise.all([
		payoutDetails(curatorId),
		prisma.checkpointFee.findMany({
			where: {
				curatorId,
				payoutId: null,
				earnedAt: { gte: month, lt: nextMonth(month) },
			},
			select: { id: true, amount: true },
		}),
		prisma.user.findUnique({
			where: { id: curatorId },
			select: { id: true, email: true },
		}),
		findPayout(curatorId, month),
	]);
	if (existing) return alreadyPaid(existing);
	if (!curator || !fees.length) {
		return { ok: false as const, error: "nothingToPay" as const };
	}
	if (!hasPayoutDetails(profile)) {
		return { ok: false as const, error: "noDetails" as const };
	}
	if (
		profile.payoutDetailsChangedAt &&
		profile.payoutDetailsChangedAt > detailsSeenAt
	) {
		return { ok: false as const, error: "detailsChanged" as const };
	}

	const amount = fees.reduce((sum, fee) => sum + fee.amount, 0);
	try {
		await prisma.$transaction(async (tx) => {
			const payout = await tx.curatorPayout.create({
				data: {
					curatorId,
					month,
					amount,
					currency: CHECKPOINT_CURRENCY,
					paidOn,
					reference,
					paidById: adminId,
				},
			});
			const { count } = await tx.checkpointFee.updateMany({
				where: { id: { in: fees.map((fee) => fee.id) }, payoutId: null },
				data: { payoutId: payout.id },
			});
			// Another admin's payout took some of these fees a moment earlier.
			if (count !== fees.length) throw new FeesTaken();
			await tx.auditLog.create({
				data: {
					actorUserId: adminId,
					entity: "curator_payout",
					entityId: payout.id,
					action: AuditAction.CREATE,
					meta: { curatorId, month: month.toISOString(), amount, reference },
				},
			});
		});
	} catch (error) {
		if (
			error instanceof FeesTaken ||
			(error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002")
		) {
			return alreadyPaid(await findPayout(curatorId, month));
		}
		throw error;
	}

	await notify(curator, `cp-payout-${curatorId}-${month.toISOString()}`, {
		title: `GDHub paid you ${formatCheckpointMoney(amount)} for ${monthLabel(month)}`,
		message: `The bank transfer went out with reference ${reference}. Your earnings show each checkpoint it covers.`,
		redirectUrl: `${appUrl()}/advisor/earnings`,
	});

	return { ok: true as const, amount };
};
