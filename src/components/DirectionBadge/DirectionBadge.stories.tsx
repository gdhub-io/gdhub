import type { Meta, StoryObj } from "@storybook/nextjs";
import { DirectionBadge } from "./index";

/** All work directions, matching the seed list in the database. */
const DIRECTIONS = [
	"development",
	"web development",
	"game design",
	"2d art & animation",
	"3d art & animation",
	"management",
	"game writer",
	"learning",
	"technical art",
	"music & sound",
	"marketing",
	"vfx",
	"qa",
	"hr",
	"video editing",
	"backend development",
	"investment",
	"other",
];

const meta: Meta<typeof DirectionBadge> = {
	title: "Components/DirectionBadge",
	component: DirectionBadge,
	parameters: { layout: "padded" },
	args: { onlyIcon: false, size: 28 },
};

export default meta;

type Story = StoryObj<typeof DirectionBadge>;

/** Every work direction with its icon + light background (two columns, as in the design). */
export const AllDirections: Story = {
	render: (args) => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(2, max-content)",
				gap: "14px 40px",
			}}
		>
			{DIRECTIONS.map((name) => (
				<DirectionBadge key={name} {...args} name={name} />
			))}
		</div>
	),
};
