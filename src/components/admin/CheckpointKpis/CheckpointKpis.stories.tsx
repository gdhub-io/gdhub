import type { Meta, StoryObj } from "@storybook/nextjs";
import { CheckpointKpis } from ".";

const meta: Meta<typeof CheckpointKpis> = {
	title: "Admin/CheckpointKpis",
	component: CheckpointKpis,
};

export default meta;

type Story = StoryObj<typeof CheckpointKpis>;

const TOTALS = {
	paid: 183230,
	refunded: 45000,
	net: 138230,
	fees: 78750,
	calls: 5812.4,
	aiCost: 797.6,
	margin: 40904,
	aiRated: 11,
	aiRatedLow: 2,
	ai: 22,
	human: 28,
};

/**
 * Above the list on 11.5 (`G3Dyx`): six money cards and AI · person; follows the list's
 * filters. Hover AI · person for the AI health line (13.6g, `bhkcn`).
 */
export const Totals: Story = {
	args: { totals: TOTALS },
};

/** Below five rated AI verdicts the line says so instead of a share. */
export const TooFewRated: Story = {
	args: { totals: { ...TOTALS, aiRated: 3, aiRatedLow: 1 } },
};

/** No AI verdict rated: the tooltip keeps its one line. */
export const NoneRated: Story = {
	args: { totals: { ...TOTALS, aiRated: 0, aiRatedLow: 0 } },
};

/** A filter that matches nothing. */
export const Empty: Story = {
	args: {
		totals: {
			paid: 0,
			refunded: 0,
			net: 0,
			fees: 0,
			calls: 0,
			aiCost: 0,
			margin: 0,
			aiRated: 0,
			aiRatedLow: 0,
			ai: 0,
			human: 0,
		},
	},
};
