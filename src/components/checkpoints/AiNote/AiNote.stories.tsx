import type { Meta, StoryObj } from "@storybook/nextjs";
import { AiNote } from ".";

const meta: Meta<typeof AiNote> = {
	title: "Checkpoints/AiNote",
	component: AiNote,
};
export default meta;

type Story = StoryObj<typeof AiNote>;

/** Frame 12.15.5: under the AI curator's message, review, goal check and verdict. */
export const Default: Story = {};

/** The narrow aside on the workflow path. */
export const Compact: Story = { args: { compact: true } };
