import { AuditAction, PayableType, type Prisma } from "@gdhub-io/gdhub-prisma";
import { RATINGS_BEFORE_AVERAGE } from "@/config/checkpoint";
import {
	monthOf,
	nextMonth,
	payoutDueOn,
	payoutStatus,
} from "@/lib/checkpoints/costs";
import { hasPayoutDetails, maskAccount } from "@/lib/payout-account";
import { checkpointNumbers } from "@/repositories/checkpoints/number";
import { CAPTURED, refundedTotal } from "@/repositories/checkpoints/refund";
import { prisma } from "@/services/prisma";
import type {
	AdminPayoutRowDto,
	AdminPayoutsDto,
	PayoutCheckpointDto,
} from "@/types/checkpoints";

/**
 * Curator payouts (Advisor Agreement §9): what each curator earned in a
 * month, the bank transfer an admin marks paid, and the curator's own view.
 */
export const monthLabel = (month: Date) =>
	month.toLocaleString("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});

export const averageRating = (ratings: number[]) => ({
	count: ratings.length,
	average:
		ratings.length >= RATINGS_BEFORE_AVERAGE
			? Math.round(
					(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) *
						10,
				) / 10
			: null,
});

export const feeSelect = {
	id: true,
	amount: true,
	reason: true,
	parts: true,
	earnedAt: true,
	curatorId: true,
	payoutId: true,
	checkpoint: {
		select: {
			id: true,
			projectId: true,
			createdAt: true,
			stageName: true,
			project: { select: { name: true } },
		},
	},
} satisfies Prisma.CheckpointFeeSelect;

type FeeRow = Prisma.CheckpointFeeGetPayload<{ select: typeof feeSelect }>;

/** Each fee with what the author paid and got back, the inputs of its "why". */
export const describeFees = async (
	fees: FeeRow[],
): Promise<PayoutCheckpointDto[]> => {
	const ids = fees.flatMap((fee) => fee.checkpoint?.id ?? []);
	const [payments, numbers] = await Promise.all([
		prisma.payment.findMany({
			where: {
				payableType: PayableType.CHECKPOINT,
				payableId: { in: ids },
				status: { in: CAPTURED },
			},
			orderBy: { createdAt: "desc" },
			select: {
				payableId: true,
				amount: true,
				refunds: { select: { amount: true } },
			},
		}),
		checkpointNumbers(fees.flatMap((fee) => fee.checkpoint ?? [])),
	]);

	return fees.map((fee) => {
		const payment = payments.find(
			(one) => one.payableId === fee.checkpoint?.id,
		);
		return {
			feeId: fee.id,
			checkpointId: fee.checkpoint?.id ?? null,
			projectName: fee.checkpoint?.project.name ?? null,
			number: fee.checkpoint ? (numbers.get(fee.checkpoint.id) ?? 0) : 0,
			stageName: fee.checkpoint?.stageName ?? null,
			closedAt: fee.earnedAt.toISOString(),
			paid: payment?.amount ?? 0,
			refunded: payment ? refundedTotal(payment.refunds) : 0,
			fee: fee.amount,
			reason: fee.reason,
			parts: fee.parts,
		};
	});
};

/** One row per curator who earned a fee in `month` (its first day, UTC). */
export const listPayouts = async (
	month: Date,
	now = new Date(),
): Promise<AdminPayoutsDto> => {
	const [fees, payouts, first] = await Promise.all([
		prisma.checkpointFee.findMany({
			where: { earnedAt: { gte: month, lt: nextMonth(month) } },
			orderBy: { earnedAt: "asc" },
			select: feeSelect,
		}),
		prisma.curatorPayout.findMany({
			where: { month },
			select: {
				id: true,
				curatorId: true,
				amount: true,
				paidOn: true,
				reference: true,
				note: true,
				paidBy: { select: { name: true } },
			},
		}),
		prisma.checkpointFee.findFirst({
			orderBy: { earnedAt: "asc" },
			select: { earnedAt: true },
		}),
	]);

	const curatorIds = [...new Set(fees.map((fee) => fee.curatorId))];
	const [curators, profiles, specialities, described, ratings] =
		await Promise.all([
			prisma.user.findMany({
				where: { id: { in: curatorIds } },
				select: { id: true, name: true, image: true },
			}),
			prisma.expertProfile.findMany({
				where: { userId: { in: curatorIds } },
				select: {
					userId: true,
					payoutHolder: true,
					payoutAccount: true,
					invoicing: true,
				},
			}),
			prisma.speciality.findMany({
				where: { userId: { in: curatorIds }, isOpenForMentoring: true },
				select: { userId: true, level: true },
			}),
			describeFees(fees),
			prisma.checkpointFeedback.findMany({
				where: { checkpoint: { curatorId: { in: curatorIds } } },
				select: { rating: true, checkpoint: { select: { curatorId: true } } },
			}),
		]);

	const rows: AdminPayoutRowDto[] = curatorIds.map((curatorId) => {
		const own = described.filter(
			(_, index) => fees[index].curatorId === curatorId,
		);
		const payout = payouts.find((one) => one.curatorId === curatorId);
		const profile = profiles.find((one) => one.userId === curatorId);
		const curator = curators.find((one) => one.id === curatorId);
		const details = hasPayoutDetails(profile)
			? {
					holder: profile.payoutHolder,
					account: maskAccount(profile.payoutAccount),
					invoicing: profile.invoicing,
				}
			: null;

		return {
			curatorId,
			name: curator?.name ?? null,
			image: curator?.image ?? null,
			level:
				specialities.find((one) => one.userId === curatorId)?.level ?? null,
			rating: averageRating(
				ratings
					.filter((one) => one.checkpoint.curatorId === curatorId)
					.map((one) => one.rating),
			),
			details,
			checkpoints: own,
			amount: payout?.amount ?? own.reduce((sum, row) => sum + row.fee, 0),
			status: payoutStatus(month, !!payout, now),
			payout: payout
				? {
						id: payout.id,
						paidOn: payout.paidOn.toISOString(),
						reference: payout.reference,
						note: payout.note,
						paidBy: payout.paidBy.name,
					}
				: null,
		};
	});

	const order = { late: 0, due: 1, notDue: 2, paid: 3 } as const;
	rows.sort((a, b) => order[a.status] - order[b.status] || b.amount - a.amount);
	const paidRows = rows.filter((row) => row.status === "paid");

	return {
		month: month.toISOString(),
		dueOn: payoutDueOn(month).toISOString(),
		firstMonth: first ? monthOf(first.earnedAt).toISOString() : null,
		rows,
		totals: {
			toPay: rows
				.filter((row) => row.status !== "paid")
				.reduce((sum, row) => sum + row.amount, 0),
			paid: paidRows.reduce((sum, row) => sum + row.amount, 0),
			curatorsPaid: paidRows.length,
			curatorsDue: rows.length - paidRows.length,
		},
	};
};

/** The full details for the Mark paid dialog; never in the list. */
export const payoutDetails = (curatorId: string) =>
	prisma.expertProfile.findUnique({
		where: { userId: curatorId },
		select: {
			payoutHolder: true,
			payoutAccount: true,
			invoicing: true,
			payoutDetailsChangedAt: true,
		},
	});

export type MarkPaidInput = {
	curatorId: string;
	month: Date;
	paidOn: Date;
	reference: string;
	/** When the admin read the details; a later change refuses the payout. */
	detailsSeenAt: Date;
};

export const findPayout = (curatorId: string, month: Date) =>
	prisma.curatorPayout.findUnique({
		where: { curatorId_month: { curatorId, month } },
		select: {
			paidOn: true,
			reference: true,
			paidBy: { select: { name: true } },
		},
	});

export const alreadyPaid = (
	payout: Awaited<ReturnType<typeof findPayout>>,
) => ({
	ok: false as const,
	error: "alreadyPaid" as const,
	paid: payout && {
		paidOn: payout.paidOn.toISOString(),
		reference: payout.reference,
		paidBy: payout.paidBy.name,
	},
});

export class FeesTaken extends Error {}

/** The one thing about a paid payout that changes. Empty text removes it. */
export const setPayoutNote = async (
	payoutId: string,
	adminId: string,
	note: string,
) => {
	const payout = await prisma.curatorPayout.findUnique({
		where: { id: payoutId },
		select: { note: true },
	});
	if (!payout) return null;

	const next = note.trim() || null;
	await prisma.$transaction([
		prisma.curatorPayout.update({
			where: { id: payoutId },
			data: { note: next },
		}),
		prisma.auditLog.create({
			data: {
				actorUserId: adminId,
				entity: "curator_payout",
				entityId: payoutId,
				action: AuditAction.UPDATE,
				// That it changed, never the text: the note is erased with the curator, its copies must be too.
				meta: { action: "note", hadNote: !!payout.note, hasNote: !!next },
			},
		}),
	]);

	return { note: next };
};
