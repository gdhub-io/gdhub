import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { DirectionSelect } from "./index";

const meta: Meta<typeof DirectionSelect> = {
	title: "Components/DirectionSelect",
	component: DirectionSelect,
	parameters: { layout: "centered" },
	args: { includeAll: true, variant: "filled", style: { width: 260 } },
	argTypes: {
		includeAll: { control: "boolean" },
		allLabel: { control: "text" },
		iconSize: { control: { type: "number", min: 16, max: 40, step: 2 } },
	},
};

export default meta;

type Story = StoryObj<typeof DirectionSelect>;

/** Direction picker — icon shown in each option and before the selected value. */
export const Default: Story = {
	render: (args) => {
		const [value, setValue] = useState<string>("game-design");
		return <DirectionSelect {...args} value={value} onChange={setValue} />;
	},
};
