import type { Meta, StoryObj } from "@storybook/nextjs";
import type { AdminPayoutRowDto, AdminPayoutsDto } from "@/types/checkpoints";
import { PayoutsTable } from ".";
import { ANNA, LEA, MARCUS, SEPTEMBER } from "./payouts.fixtures";

const month = (
	rows: AdminPayoutRowDto[],
	extra: Partial<AdminPayoutsDto> = {},
): AdminPayoutsDto => {
	const paid = rows.filter((row) => row.status === "paid");
	const due = rows.filter((row) => row.status !== "paid");

	return {
		...SEPTEMBER,
		rows,
		totals: {
			toPay: due.reduce((sum, row) => sum + row.amount, 0),
			paid: paid.reduce((sum, row) => sum + row.amount, 0),
			curatorsPaid: paid.length,
			curatorsDue: due.length,
		},
		...extra,
	};
};

const MARCUS_NO_NOTE: AdminPayoutRowDto = {
	...MARCUS,
	payout: MARCUS.payout && { ...MARCUS.payout, note: null },
};

const meta: Meta<typeof PayoutsTable> = {
	title: "Admin/PayoutsTable",
	component: PayoutsTable,
	args: {
		status: "success",
		canManage: true,
		onRetry: () => {},
		onMarkPaid: () => {},
		onEditNote: () => {},
	},
};

export default meta;

type Story = StoryObj<typeof PayoutsTable>;

/** Frame 13.2 (`DM48P`): September, four due and one paid, Anna's row open. */
export const Data: Story = {
	args: { data: SEPTEMBER, defaultExpanded: [ANNA.curatorId] },
};

/** A due row; ⋮ → Mark paid (13.2b `c14iz`). */
export const Due: Story = { args: { data: month([ANNA]) } };

/** A row opened on its checkpoints and why each fee is what it is. */
export const Expanded: Story = {
	args: { data: month([ANNA]), defaultExpanded: [ANNA.curatorId] },
};

/** Lea without payout details: Mark paid is locked, the reason on hover. */
export const NoDetails: Story = { args: { data: month([LEA]) } };

/** Paid; ⋮ → Add a note. */
export const Paid: Story = { args: { data: month([MARCUS_NO_NOTE]) } };

/** Paid with a note under the status; ⋮ → Edit note. */
export const PaidWithNote: Story = { args: { data: month([MARCUS]) } };

/** The current month: nothing is due yet, so no row menu. */
export const NotDueYet: Story = {
	args: {
		data: month(
			[ANNA, LEA].map((row) => ({ ...row, status: "notDue" as const })),
			{
				month: "2026-10-01T00:00:00.000Z",
				dueOn: "2026-11-15T00:00:00.000Z",
			},
		),
	},
};

/** View permission only: no row menu. */
export const ReadOnly: Story = {
	args: { data: SEPTEMBER, canManage: false },
};

/** 13.2c (`eKCNh`): cards at zero, one line of plain text. */
export const Empty: Story = {
	args: {
		data: month([], {
			month: "2026-08-01T00:00:00.000Z",
			dueOn: "2026-09-15T00:00:00.000Z",
		}),
	},
};

/** 13.2d (`dGB1n`): the head stays, rows are skeleton bars. */
export const Loading: Story = { args: { data: undefined, status: "pending" } };

/** 13.2e (`PpnI5`): cards read —, the error state offers Try again. */
export const ErrorState: Story = {
	name: "Error",
	args: { data: undefined, status: "error" },
};
