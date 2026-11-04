import type { Meta, StoryObj } from "@storybook/nextjs";
import { SafeBlocks } from ".";

const meta: Meta<typeof SafeBlocks> = {
	title: "UI/SafeBlocks",
	component: SafeBlocks,
};

export default meta;
type Story = StoryObj<typeof SafeBlocks>;

export const Default: Story = {
	args: {
		data: {
			time: 0,
			version: "2.31.0",
			blocks: [
				{ type: "header", data: { text: "Week one", level: 2 } },
				{
					type: "paragraph",
					data: {
						text: 'We shipped the <b>first level</b> and <mark class="cdx-marker">fixed the jump</mark>.<script>alert(1)</script>',
					},
				},
				{
					type: "list",
					data: { style: "unordered", items: ["Art pass", "Sound pass"] },
				},
			],
		},
	},
};

export const Empty: Story = {
	args: { data: null },
};
