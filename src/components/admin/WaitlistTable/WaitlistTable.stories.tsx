import type { Meta, StoryObj } from "@storybook/nextjs";
import { WaitlistTable } from ".";

const ROWS = [
	{
		id: "w1",
		email: "marta.ilves@gmail.com",
		createdAt: "2026-10-22T09:00:00.000Z",
	},
	{
		id: "w2",
		email: "owen@tidepool.games",
		createdAt: "2026-10-21T15:00:00.000Z",
	},
	{
		id: "w3",
		email: "anna.k@studio-north.io",
		createdAt: "2026-10-20T11:00:00.000Z",
	},
];

const meta: Meta<typeof WaitlistTable> = {
	title: "Admin/Checkpoints/Expert waitlist",
	component: WaitlistTable,
	args: {
		onRetry: () => {},
		onSearch: () => {},
		selected: [],
		onSelect: () => {},
		onWrite: () => {},
	},
};

export default meta;

type Story = StoryObj<typeof WaitlistTable>;

/** Frame 13.8. */
export const Default: Story = {
	args: { rows: ROWS, total: ROWS.length, status: "success" },
};

/** Two ticked: Write goes to them only. */
export const Selected: Story = {
	args: {
		rows: ROWS,
		total: ROWS.length,
		status: "success",
		selected: ["w2", "w3"],
	},
};

export const Empty: Story = { args: { rows: [], total: 0, status: "success" } };

export const Loading: Story = {
	args: { rows: undefined, total: undefined, status: "pending" },
};

export const Failed: Story = {
	args: { rows: undefined, total: undefined, status: "error" },
};
