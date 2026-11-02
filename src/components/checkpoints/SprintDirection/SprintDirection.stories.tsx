import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import type { SprintDirection } from "@/types/checkpoints";
import { DirectionConfirm, SprintDirectionView } from ".";

/** E2E Test Game, sprint 1: the jump landed, the level is still ahead. */
const DIRECTION: SprintDirection = {
	goal: {
		value: "toward",
		why: "The jump with coyote time and a jump buffer was shown in a web build.",
	},
	stage: {
		value: "stalled",
		why: "Level 1 has not started; only movement is playable.",
	},
};

const meta: Meta = {
	title: "Checkpoints/SprintDirection",
	decorators: [
		(Story) => (
			<QueryClientProvider client={new QueryClient()}>
				<App>
					<div style={{ maxWidth: 720 }}>
						<Story />
					</div>
				</App>
			</QueryClientProvider>
		),
	],
};
export default meta;
type Story = StoryObj;

/** 12.10.3: the author's Review tab, AI review or a confirmed call. */
export const ReadOnly: Story = {
	render: () => (
		<SprintDirectionView direction={DIRECTION} stage="Prototyping" />
	),
};

/** 12.10.3: a sprint where nothing changed. */
export const NothingDone: Story = {
	render: () => (
		<SprintDirectionView
			direction={{
				goal: {
					value: "idle",
					why: "No artifact, devlog or change in the sprint.",
				},
				stage: {
					value: "idle",
					why: "No artifact, devlog or change in the sprint.",
				},
			}}
			stage="Prototyping"
		/>
	),
};

/** 12.08.7b: after the call, preset from the brief, not yet confirmed. */
export const CuratorToConfirm: Story = {
	render: () => (
		<DirectionConfirm
			checkpointId="cp-story"
			index={2}
			direction={{ ...DIRECTION, confirmedAt: null }}
			stage="Prototyping"
			editable
		/>
	),
};

/** 12.08.7b: no preset — the brief proposed none and the call did not say. */
export const CuratorNoPreset: Story = {
	render: () => (
		<DirectionConfirm
			checkpointId="cp-story"
			index={2}
			direction={undefined}
			stage="Prototyping"
			editable
		/>
	),
};

/** 12.08.7d: confirmed, with Change until the final call. */
export const CuratorConfirmed: Story = {
	render: () => (
		<DirectionConfirm
			checkpointId="cp-story"
			index={2}
			direction={{ ...DIRECTION, confirmedAt: "2026-11-09T12:00:00.000Z" }}
			stage="Prototyping"
			editable
		/>
	),
};

/** 12.08.7d: the final call has started, the direction is settled. */
export const CuratorSettled: Story = {
	render: () => (
		<DirectionConfirm
			checkpointId="cp-story"
			index={2}
			direction={{ ...DIRECTION, confirmedAt: "2026-11-09T12:00:00.000Z" }}
			stage="Prototyping"
			editable={false}
		/>
	),
};
