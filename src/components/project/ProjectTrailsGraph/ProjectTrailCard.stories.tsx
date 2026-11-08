import type { Meta, StoryObj } from "@storybook/nextjs";
import { InverseBand } from "@/components/ui/InverseBand";
import type { ProjectTrailDto } from "@/types/project-trails";
import { ProjectTrailCard } from "./ProjectTrailCard";

const now = new Date("2026-11-17T12:00:00Z");
const active = {
	order: 2,
	status: "active" as const,
	startedAt: "2026-11-01T00:00:00Z",
};
const closed = { ...active, order: 1, status: "closed" as const };

const project: ProjectTrailDto = {
	id: "p1",
	slug: "echo-vale",
	name: "Echo Vale: Tides of the Deep",
	coverImage: null,
	status: "inProgress",
	score: 60,
	stageCount: 9,
	nextStage: "Prototyping",
	stages: [
		{ name: "Ideation", number: 2, checkpoints: [] },
		{ name: "Concepting", number: 3, checkpoints: [closed, active] },
	],
};

const meta: Meta<typeof ProjectTrailCard> = {
	title: "Components/Project trails/Card",
	component: ProjectTrailCard,
	args: { project, now },
	decorators: [
		(Story) => (
			<InverseBand density="product" style={{ padding: 24 }}>
				<Story />
			</InverseBand>
		),
	],
};

export default meta;
type Story = StoryObj<typeof ProjectTrailCard>;

export const PassedStage: Story = {
	args: { point: { kind: "stage", stage: "Ideation", stageIndex: 0 } },
};

export const CurrentStage: Story = {
	args: { point: { kind: "stage", stage: "Concepting", stageIndex: 1 } },
};

export const StageGoal: Story = {
	args: { point: { kind: "stageGoal", stage: "Concepting", stageIndex: 1 } },
};

export const ClosedCheckpoint: Story = {
	args: {
		point: {
			kind: "checkpoint",
			stage: "Concepting",
			stageIndex: 1,
			checkpoint: closed,
		},
	},
};

export const ActiveCheckpointNow: Story = {
	args: {
		point: {
			kind: "now",
			stage: "Concepting",
			stageIndex: 1,
			checkpoint: active,
		},
	},
};

export const ActiveCheckpointEnd: Story = {
	args: {
		point: {
			kind: "checkpointEnd",
			stage: "Concepting",
			stageIndex: 1,
			checkpoint: active,
		},
	},
};

export const CheckpointInReview: Story = {
	args: {
		point: {
			kind: "checkpoint",
			stage: "Concepting",
			stageIndex: 1,
			checkpoint: { ...active, status: "review" },
		},
	},
};

export const DormantWithCover: Story = {
	args: {
		project: {
			...project,
			status: "abandoned",
			coverImage: "https://picsum.photos/seed/trails/80",
		},
		point: { kind: "stage", stage: "Ideation", stageIndex: 0 },
	},
};
