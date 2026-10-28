import type { Meta, StoryObj } from "@storybook/nextjs";
import { CallCountdown } from "./CallCountdown";

const meta: Meta<typeof CallCountdown> = {
	title: "Checkpoints/Call room/CallCountdown",
	component: CallCountdown,
};
export default meta;

type Story = StoryObj<typeof CallCountdown>;

const inMinutes = (minutes: number) =>
	new Date(Date.now() + minutes * 60_000).toISOString();

/** Day 0: call 1 is days away. */
export const DaysAway: Story = { args: { at: inMinutes(3 * 24 * 60 + 125) } };

/** The call is today. */
export const HoursAway: Story = { args: { at: inMinutes(5 * 60 + 12) } };

/** Minutes before the room opens. */
export const MinutesAway: Story = { args: { at: inMinutes(18) } };
