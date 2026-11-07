import type { Meta, StoryObj } from "@storybook/nextjs";
import { HubSidebarSkeleton } from "./HubSidebarSkeleton";

const meta: Meta<typeof HubSidebarSkeleton> = {
	title: "Components/HubSidebarSkeleton",
	component: HubSidebarSkeleton,
	parameters: { layout: "padded" },
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 360 }}>
				<Story />
			</div>
		),
	],
};

export default meta;

export const Loading: StoryObj<typeof HubSidebarSkeleton> = {
	args: { title: "Open positions", rows: 3 },
};
