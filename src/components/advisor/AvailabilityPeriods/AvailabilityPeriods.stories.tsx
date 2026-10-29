import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { CheckpointStatus } from "@/config/prisma-enums";
import type { AvailabilityRule } from "@/lib/advisor-availability";
import type { BookedCall } from "@/repositories/advisor/availability";
import { AvailabilityPeriods, type AvailabilityPeriodsProps } from ".";

const RULES: AvailabilityRule[] = [
	{
		monthFrom: null,
		monthTo: null,
		weekdays: [1, 2, 3, 4, 5],
		ranges: [{ from: 9 * 60, to: 13 * 60 }],
		forConsultations: true,
		forCheckpoints: true,
	},
	{
		monthFrom: "2027-01-01",
		monthTo: "2027-08-31",
		weekdays: [2, 4],
		ranges: [
			{ from: 10 * 60, to: 12 * 60 },
			{ from: 15 * 60, to: 17 * 60 },
		],
		forConsultations: false,
		forCheckpoints: true,
	},
	{
		monthFrom: "2027-07-01",
		monthTo: "2027-07-31",
		weekdays: [1],
		ranges: [{ from: 18 * 60, to: 19 * 60 }],
		forConsultations: true,
		forCheckpoints: false,
	},
];

const REFUSED: BookedCall[] = [
	{
		sessionId: "s2",
		index: 2,
		scheduledAt: "2026-09-14T13:00:00.000Z",
		checkpointId: "cp1",
		checkpointStatus: CheckpointStatus.Active,
		projectName: "Lantern Keeper",
		projectSlug: "lantern-keeper",
	},
	{
		sessionId: "s3",
		index: 3,
		scheduledAt: "2026-09-21T13:00:00.000Z",
		checkpointId: "cp1",
		checkpointStatus: CheckpointStatus.Active,
		projectName: "Lantern Keeper",
		projectSlug: "lantern-keeper",
	},
];

const Stateful = (props: Omit<AvailabilityPeriodsProps, "onChange">) => {
	const [rules, setRules] = useState(props.rules);
	return <AvailabilityPeriods {...props} rules={rules} onChange={setRules} />;
};

const meta: Meta<typeof Stateful> = {
	title: "Advisor/Availability periods",
	component: Stateful,
	args: { timeZone: "Europe/Berlin", rules: RULES },
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 720 }}>
				<Story />
			</div>
		),
	],
};
export default meta;

type Story = StoryObj<typeof Stateful>;

export const Empty: Story = { args: { rules: [] } };

export const WithPeriods: Story = {};

export const EditorOpen: Story = { args: { initialEditing: "new" } };

export const EditingAPeriod: Story = { args: { initialEditing: 1 } };

export const Refused: Story = { args: { refused: REFUSED } };
