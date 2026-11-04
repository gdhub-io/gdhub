import type { Meta, StoryObj } from "@storybook/nextjs";
import { CheckpointStatus } from "@/config/prisma-enums";
import { AdvisorCallList, type AdvisorCallListProps } from ".";

const NOW = new Date("2026-10-12T11:00:00.000Z");

const call = (
	sessionId: string,
	index: number,
	scheduledAt: string,
	projectName: string,
): AdvisorCallListProps["calls"][number] => ({
	sessionId,
	index,
	scheduledAt,
	endedAt: null,
	checkpointId: `cp-${projectName}`,
	checkpointStatus: CheckpointStatus.Active,
	projectName,
	projectSlug: projectName.toLowerCase().replaceAll(" ", "-"),
});

const meta: Meta<typeof AdvisorCallList> = {
	title: "Advisor/Call list",
	component: AdvisorCallList,
	args: {
		timeZone: "Europe/Berlin",
		now: NOW,
		upcoming: true,
		emptyText: "No calls booked yet.",
	},
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 840 }}>
				<Story />
			</div>
		),
	],
};
export default meta;

type Story = StoryObj<typeof AdvisorCallList>;

export const Upcoming: Story = {
	args: {
		calls: [
			call("s1", 2, "2026-10-12T13:00:00.000Z", "Lantern Keeper"),
			call("s2", 5, "2026-10-12T15:00:00.000Z", "Tidebound"),
			call("s3", 3, "2026-10-19T13:00:00.000Z", "Lantern Keeper"),
		],
	},
};

export const Past: Story = {
	args: {
		upcoming: false,
		emptyText: "No past calls.",
		calls: [
			call("s4", 1, "2026-10-05T13:00:00.000Z", "Lantern Keeper"),
			call("s5", 4, "2026-09-28T09:00:00.000Z", "Tidebound"),
		],
	},
};

export const Empty: Story = { args: { calls: [] } };
