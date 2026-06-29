import type { Meta, StoryObj } from "@storybook/nextjs";
import { WORK_DIRECTIONS } from "@/components/DirectionBadge";
import { VacancyCard, type VacancyCardProps } from "./index";

/** Cooperation type drives what the card footer shows. */
type Cooperation = "paid" | "equity" | "experience";

type StoryArgs = Pick<
	VacancyCardProps,
	"directionName" | "title" | "projectName"
> & {
	cooperation: Cooperation;
};

/** Map the simplified `cooperation` control to the card's compensation props. */
function cooperationProps(cooperation: Cooperation): Partial<VacancyCardProps> {
	switch (cooperation) {
		case "paid":
			return { offeredAmount: 2500, offeredRateType: "Monthly" };
		case "equity":
			return { promisePercentage: 5 };
		default:
			return {};
	}
}

const meta: Meta<StoryArgs> = {
	title: "Components/VacancyCard",
	component: VacancyCard,
	parameters: { layout: "centered" },
	argTypes: {
		directionName: {
			control: "select",
			options: WORK_DIRECTIONS.map((d) => d.label),
			description: "Work direction (sets the icon and background color).",
		},
		title: { control: "text", description: "Vacancy title." },
		projectName: { control: "text", description: "Parent project name." },
		cooperation: {
			control: "inline-radio",
			options: ["paid", "equity", "experience"],
			description: "Cooperation type shown in the footer.",
		},
	},
	args: {
		directionName: "game design",
		title: "Systems & Level Designer",
		projectName: "Astra Tactics",
		cooperation: "equity",
	},
	render: ({ cooperation, ...args }) => (
		<div style={{ width: 320 }}>
			<VacancyCard
				{...args}
				finishedAt="2026-09-02"
				detailsHref="#"
				{...cooperationProps(cooperation)}
			/>
		</div>
	),
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** Configure direction, title and cooperation type via the controls panel. */
export const Playground: Story = {};

/** Paid vacancy — shows the amount and period. */
export const Paid: Story = {
	args: {
		directionName: "2d art & animation",
		title: "Senior 2D Character Artist",
		projectName: "Mythscape",
		cooperation: "paid",
	},
};

/** Equity vacancy — shows the offered percentage. */
export const Equity: Story = {
	args: {
		directionName: "development",
		title: "Unity Gameplay Programmer",
		projectName: "Starbound Saga",
		cooperation: "equity",
	},
};

/** Enthusiast vacancy — "for experience", no money or equity. */
export const ForExperience: Story = {
	args: {
		directionName: "web development",
		title: "Frontend Web Developer (React)",
		projectName: "Neon Drift",
		cooperation: "experience",
	},
};
