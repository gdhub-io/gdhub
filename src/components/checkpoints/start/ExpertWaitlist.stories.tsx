import type { Meta, StoryObj } from "@storybook/nextjs";
import { ExpertWaitlist } from "./ExpertWaitlist";

const meta: Meta<typeof ExpertWaitlist> = {
	title: "Checkpoints/Purchase/Expert waitlist",
	component: ExpertWaitlist,
	args: { joining: false, onJoin: () => {}, onChooseAI: () => {} },
};

export default meta;

type Story = StoryObj<typeof ExpertWaitlist>;

/** Frame 12.4b, before: the author chose an expert. */
export const Before: Story = { args: { joined: false } };

export const Joining: Story = { args: { joined: false, joining: true } };

/** Frame 12.4b, after "Join the waitlist". */
export const Joined: Story = { args: { joined: true } };

export const Loading: Story = { args: { joined: undefined } };
