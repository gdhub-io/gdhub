import type { Meta, StoryObj } from "@storybook/nextjs";
import { WORK_DIRECTIONS } from "./directions";
import { DirectionBadge } from "./index";

const meta: Meta<typeof DirectionBadge> = {
	title: "Components/DirectionBadge",
	component: DirectionBadge,
	parameters: { layout: "padded" },
	args: { onlyIcon: false, size: 28 },
	argTypes: {
		name: {
			control: "select",
			options: WORK_DIRECTIONS.map((d) => d.label),
		},
	},
};

export default meta;

type Story = StoryObj<typeof DirectionBadge>;

/** Single badge, configurable via controls. */
export const Playground: Story = {
	args: { name: "game design" },
};

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
			{WORK_DIRECTIONS.map((d) => (
				<DirectionBadge key={d.slug} {...args} name={d.label} />
			))}
		</div>
	),
};

/** The full direction → icon + color mapping object, rendered as a reference table. */
export const DirectionMap: StoryObj = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(3, max-content)",
				alignItems: "center",
				gap: "14px 28px",
				fontSize: 13,
			}}
		>
			{WORK_DIRECTIONS.map((d) => (
				<div key={d.slug} style={{ display: "contents" }}>
					<DirectionBadge name={d.label} />
					<span
						style={{
							color: "var(--gd-color-text-secondary)",
							fontFamily: "monospace",
						}}
					>
						{d.slug}
					</span>
					<span
						style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
					>
						<span
							style={{
								width: 20,
								height: 20,
								borderRadius: "var(--gd-radius-chip)",
								background: d.color,
								border: "1px solid rgba(0,0,0,0.08)",
							}}
						/>
						<span
							style={{
								color: "var(--gd-color-text-secondary)",
								fontFamily: "monospace",
							}}
						>
							{d.color}
						</span>
					</span>
				</div>
			))}
		</div>
	),
};
