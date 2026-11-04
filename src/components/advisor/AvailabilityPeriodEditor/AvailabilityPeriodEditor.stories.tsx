import type { Meta, StoryObj } from "@storybook/nextjs";
import { AvailabilityPeriodEditor } from ".";

const meta: Meta<typeof AvailabilityPeriodEditor> = {
	title: "Advisor/Availability period editor",
	component: AvailabilityPeriodEditor,
	args: { onSubmit: () => {}, onCancel: () => {} },
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 720 }}>
				<Story />
			</div>
		),
	],
};
export default meta;

type Story = StoryObj<typeof AvailabilityPeriodEditor>;

export const NewPeriod: Story = { args: { rule: null } };

export const EditingMonths: Story = {
	args: {
		rule: {
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
	},
};
