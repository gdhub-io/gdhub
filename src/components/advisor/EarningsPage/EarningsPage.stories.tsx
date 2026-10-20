import type { Meta, StoryObj } from "@storybook/nextjs";
import { CheckpointFeeReason } from "@/config/prisma-enums";
import type { CuratorEarningsDto } from "@/types/checkpoints";
import { EarningsPage } from ".";

type Checkpoint = CuratorEarningsDto["checkpoints"][number];

const checkpoint = (
	id: string,
	extra: Partial<Checkpoint> &
		Pick<Checkpoint, "projectName" | "number" | "stageName" | "closedAt">,
): Checkpoint => ({
	feeId: id,
	checkpointId: `c-${id}`,
	paid: 45000,
	refunded: 0,
	fee: 31500,
	reason: CheckpointFeeReason.Full,
	parts: 6,
	status: "due",
	noFee: null,
	on: "2026-10-15T00:00:00.000Z",
	...extra,
});

const CHECKPOINTS: Checkpoint[] = [
	checkpoint("f1", {
		projectName: "Ash Lake",
		number: 2,
		stageName: "Demo",
		closedAt: "2026-10-06T10:00:00.000Z",
		status: "earned",
		on: "2026-11-15T00:00:00.000Z",
	}),
	checkpoint("f2", {
		projectName: "Quiet Orbit",
		number: 4,
		stageName: "Launch prep",
		closedAt: "2026-09-28T10:00:00.000Z",
	}),
	checkpoint("f3", {
		projectName: "Moss Garden",
		number: 2,
		stageName: "Demo",
		closedAt: "2026-09-19T10:00:00.000Z",
		refunded: 15000,
		fee: 21000,
		reason: CheckpointFeeReason.RefundReduced,
	}),
	checkpoint("f4", {
		projectName: "Night Ferry",
		number: 1,
		stageName: "Concept",
		closedAt: "2026-09-11T10:00:00.000Z",
		fee: 15750,
		reason: CheckpointFeeReason.Replacement,
		parts: 3,
	}),
	checkpoint("f5", {
		feeId: null,
		projectName: "Salt & Iron",
		number: 1,
		stageName: "Prototype",
		closedAt: "2026-08-30T10:00:00.000Z",
		paid: 0,
		fee: 0,
		reason: null,
		parts: 0,
		status: "noFee",
		noFee: "stopped",
		on: null,
	}),
	checkpoint("f6", {
		projectName: "Red Kite",
		number: 3,
		stageName: "Vertical slice",
		closedAt: "2026-08-22T10:00:00.000Z",
		status: "paid",
		on: "2026-09-03T00:00:00.000Z",
	}),
];

const DATA: CuratorEarningsDto = {
	account: "DE89 •••• 3000",
	earned: {
		month: "2026-10-01T00:00:00.000Z",
		amount: 31500,
		dueOn: "2026-11-15T00:00:00.000Z",
	},
	due: {
		amount: 68250,
		month: "2026-09-01T00:00:00.000Z",
		dueOn: "2026-10-15T00:00:00.000Z",
	},
	paidTotal: {
		amount: 189000,
		count: 3,
		since: "2026-06-01T00:00:00.000Z",
	},
	checkpoints: CHECKPOINTS,
	payouts: [
		{
			month: "2026-08-01T00:00:00.000Z",
			count: 2,
			amount: 63000,
			paidOn: "2026-09-03T00:00:00.000Z",
			reference: "SEB-20260903-0201",
		},
		{
			month: "2026-07-01T00:00:00.000Z",
			count: 3,
			amount: 78750,
			paidOn: "2026-08-04T00:00:00.000Z",
			reference: "SEB-20260804-0117",
		},
		{
			month: "2026-06-01T00:00:00.000Z",
			count: 2,
			amount: 47250,
			paidOn: "2026-07-02T00:00:00.000Z",
			reference: "SEB-20260702-0093",
		},
	],
};

const meta: Meta<typeof EarningsPage> = {
	title: "Advisor/EarningsPage",
	component: EarningsPage,
	args: { onRetry: () => {} },
};

export default meta;

type Story = StoryObj<typeof EarningsPage>;

/** 13.4: Earned, Due, Paid and No fee rows; three payouts. */
export const Data: Story = { args: { data: DATA, status: "success" } };

/** 13.4: past twelve rows the table pages. */
export const Paged: Story = {
	args: {
		data: {
			...DATA,
			checkpoints: Array.from({ length: 3 }, (_, round) =>
				CHECKPOINTS.map((row) => ({
					...row,
					feeId: row.feeId && `${row.feeId}-${round}`,
					checkpointId: `${row.checkpointId}-${round}`,
				})),
			).flat(),
		},
		status: "success",
	},
};

/** 13.4b: a new curator without payout details and no payouts yet. */
export const NoDetails: Story = {
	args: {
		data: {
			...DATA,
			account: null,
			paidTotal: { amount: 0, count: 0, since: null },
			checkpoints: CHECKPOINTS.slice(0, 4),
			payouts: [],
		},
		status: "success",
	},
};

/** 13.4c: nothing has closed yet. */
export const Empty: Story = {
	args: {
		data: {
			...DATA,
			earned: { ...DATA.earned, amount: 0 },
			due: { ...DATA.due, amount: 0 },
			paidTotal: { amount: 0, count: 0, since: null },
			checkpoints: [],
			payouts: [],
		},
		status: "success",
	},
};

/** 13.4c */
export const Loading: Story = { args: { data: undefined, status: "pending" } };

/** 13.4c */
export const ErrorState: Story = {
	name: "Error",
	args: { data: undefined, status: "error" },
};
