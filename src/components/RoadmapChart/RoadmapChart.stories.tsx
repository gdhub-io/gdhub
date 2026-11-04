import type { Meta, StoryObj } from "@storybook/nextjs";
import { RoadmapChart, type RoadmapStep } from ".";

// The chart drops the first and the last step (introduction and completion).
const STEPS: RoadmapStep[] = [
	"Introduction",
	"Ideation",
	"Prototyping",
	"Preparing a demo version",
	"Vertical slice",
	"Release",
	"Completion",
].map((name, order) => ({
	id: `s${order}`,
	name,
	order,
	plannedAt:
		order > 0 && order < 6
			? `2026-${String(order * 2).padStart(2, "0")}-01`
			: null,
}));

const meta: Meta<typeof RoadmapChart> = {
	title: "Components/Workflow/RoadmapChart",
	component: RoadmapChart,
	parameters: { layout: "padded" },
};

export default meta;

type Story = StoryObj<typeof RoadmapChart>;

/** Two stages behind, solid; the marker at the start of the third. */
export const MidRoad: Story = {
	args: {
		workflow: { projectId: "p1", steps: STEPS, currentStep: STEPS[3] },
	},
};

/** The first stage: nothing behind, the marker at the road's start. */
export const FirstStage: Story = {
	args: {
		workflow: { projectId: "p1", steps: STEPS, currentStep: STEPS[1] },
	},
};

/** The last stage. */
export const LastStage: Story = {
	args: {
		workflow: { projectId: "p1", steps: STEPS, currentStep: STEPS[5] },
	},
};
