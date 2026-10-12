import type { Meta, StoryObj } from "@storybook/nextjs";
import { CheckpointStatus } from "@/config/prisma-enums";
import { RefusedCallsAlert } from ".";

const meta: Meta<typeof RefusedCallsAlert> = {
	title: "Advisor/Refused calls alert",
	component: RefusedCallsAlert,
	args: { timeZone: "Europe/Berlin" },
};
export default meta;

type Story = StoryObj<typeof RefusedCallsAlert>;

export const OneCall: Story = {
	args: {
		calls: [
			{
				sessionId: "s2",
				index: 2,
				scheduledAt: "2026-09-14T13:00:00.000Z",
				checkpointId: "cp1",
				checkpointStatus: CheckpointStatus.Active,
				projectName: "Lantern Keeper",
				projectSlug: "lantern-keeper",
			},
		],
	},
};
