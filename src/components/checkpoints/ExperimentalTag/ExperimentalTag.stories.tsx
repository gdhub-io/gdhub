import type { Meta, StoryObj } from "@storybook/nextjs";
import { ExperimentalTag } from ".";

const meta: Meta<typeof ExperimentalTag> = {
	title: "Checkpoints/ExperimentalTag",
	component: ExperimentalTag,
};
export default meta;

/** Frame 12.15.6: the checkpoint header, the purchase shell and the landing hero. */
export const Default: StoryObj<typeof ExperimentalTag> = {};
