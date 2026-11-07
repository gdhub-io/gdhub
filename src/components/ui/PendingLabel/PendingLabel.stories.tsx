import type { Meta, StoryObj } from "@storybook/nextjs";
import Link from "next/link";
import { PendingLabel } from ".";

const meta: Meta<typeof PendingLabel> = {
	title: "Design system/PendingLabel",
	component: PendingLabel,
	parameters: { layout: "padded" },
};

export default meta;

/** Idle: a pending state needs a real navigation, which Storybook has not. */
export const Idle: StoryObj<typeof PendingLabel> = {
	render: () => (
		<Link href="/hub">
			<PendingLabel>Workflow</PendingLabel>
		</Link>
	),
};
