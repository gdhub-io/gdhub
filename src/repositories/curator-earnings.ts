import {
	CheckpointCuratorKind,
	CheckpointStatus,
} from "@gdhub-io/gdhub-prisma";
import { monthOf, payoutDueOn } from "@/lib/checkpoint-costs";
import { checkpointNumber } from "@/repositories/checkpoint-number";
import {
	describeFees,
	feeSelect,
	maskAccount,
} from "@/repositories/checkpoint-payouts";
import { prisma } from "@/services/prisma";
import type { CuratorEarningsDto } from "@/types/checkpoints";

/** What one curator earned, is owed and was paid. Only their own rows. */
export const curatorEarnings = async (
	curatorId: string,
	now = new Date(),
): Promise<CuratorEarningsDto> => {
	const thisMonth = monthOf(now);
	const [fees, unpaidCheckpoints, payouts, profile] = await Promise.all([
		prisma.checkpointFee.findMany({
			where: { curatorId },
			orderBy: { earnedAt: "desc" },
			select: { ...feeSelect, payout: { select: { paidOn: true } } },
		}),
		// Finished under them with nothing earned: they stopped, or an admin decided.
		prisma.projectCheckpoint.findMany({
			where: {
				curatorId,
				curatorKind: CheckpointCuratorKind.Human,
				status: { in: [CheckpointStatus.Closed, CheckpointStatus.Cancelled] },
				fees: { none: { curatorId } },
			},
			orderBy: { updatedAt: "desc" },
			select: {
				id: true,
				projectId: true,
				createdAt: true,
				updatedAt: true,
				decidedAt: true,
				decidedById: true,
				stageName: true,
				project: { select: { name: true } },
			},
		}),
		prisma.curatorPayout.findMany({
			where: { curatorId },
			orderBy: { month: "desc" },
			select: {
				month: true,
				amount: true,
				paidOn: true,
				reference: true,
				_count: { select: { fees: true } },
			},
		}),
		prisma.expertProfile.findUnique({
			where: { userId: curatorId },
			select: { payoutAccount: true },
		}),
	]);

	const [described, numbers] = await Promise.all([
		describeFees(fees),
		Promise.all(unpaidCheckpoints.map((row) => checkpointNumber(row))),
	]);

	const earned = described.map((row, index) => {
		const fee = fees[index];
		const month = monthOf(fee.earnedAt);
		const status = fee.payout
			? ("paid" as const)
			: month >= thisMonth
				? ("earned" as const)
				: ("due" as const);
		return {
			...row,
			status,
			noFee: null,
			on: (fee.payout?.paidOn ?? payoutDueOn(month)).toISOString(),
		};
	});
	const none = unpaidCheckpoints.map((row, index) => ({
		feeId: null,
		checkpointId: row.id,
		projectName: row.project.name,
		number: numbers[index],
		stageName: row.stageName,
		closedAt: (row.decidedAt ?? row.updatedAt).toISOString(),
		paid: 0,
		refunded: 0,
		fee: 0,
		reason: null,
		parts: 0,
		status: "noFee" as const,
		noFee:
			row.decidedById && row.decidedById !== curatorId
				? ("adminVerdict" as const)
				: ("stopped" as const),
		on: null,
	}));

	const dueRows = earned.filter((row) => row.status === "due");
	const oldestDue = dueRows.at(-1);
	const sum = (rows: { fee: number }[]) =>
		rows.reduce((total, row) => total + row.fee, 0);

	return {
		account: profile?.payoutAccount ? maskAccount(profile.payoutAccount) : null,
		earned: {
			month: thisMonth.toISOString(),
			amount: sum(earned.filter((row) => row.status === "earned")),
			dueOn: payoutDueOn(thisMonth).toISOString(),
		},
		due: oldestDue
			? {
					amount: sum(dueRows),
					month: monthOf(oldestDue.closedAt).toISOString(),
					dueOn: payoutDueOn(monthOf(oldestDue.closedAt)).toISOString(),
				}
			: null,
		paidTotal: {
			amount: payouts.reduce((total, payout) => total + payout.amount, 0),
			count: payouts.length,
			since: payouts.at(-1)?.month.toISOString() ?? null,
		},
		checkpoints: [...earned, ...none].sort((a, b) =>
			b.closedAt.localeCompare(a.closedAt),
		),
		payouts: payouts.map((payout) => ({
			month: payout.month.toISOString(),
			count: payout._count.fees,
			amount: payout.amount,
			paidOn: payout.paidOn.toISOString(),
			reference: payout.reference,
		})),
	};
};
