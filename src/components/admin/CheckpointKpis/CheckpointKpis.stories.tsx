import type { Meta, StoryObj } from "@storybook/nextjs";
import { CheckpointKpis } from ".";

const meta: Meta<typeof CheckpointKpis> = {
	title: "Admin/CheckpointKpis",
	component: CheckpointKpis,
};

export default meta;

type Story = StoryObj<typeof CheckpointKpis>;

/** Above the list on 11.5 (`G3Dyx`); follows the list's filters. */
export const Totals: Story = {
	args: {
		totals: { paid: 183230, refunded: 45000, net: 138230, ai: 4, human: 5 },
	},
};

/** A filter that matches nothing. */
export const Empty: Story = {
	args: { totals: { paid: 0, refunded: 0, net: 0, ai: 0, human: 0 } },
};
