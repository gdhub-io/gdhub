import type { Meta, StoryObj } from "@storybook/nextjs";
import { Flex } from "antd";
import {
	CheckpointCuratorKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import { sprintOfDate } from "@/lib/checkpoint-sprints";
import type { CheckpointDto } from "@/types/checkpoints";
import { AskPanel } from "./AskPanel";
import { CheckpointCard } from "./CheckpointCard";
import { CheckpointPath } from "./CheckpointPath";
import { CheckpointStatusSlot } from "./CheckpointStatusSlot";
import { CuratorBadge } from "./CuratorBadge";
import { VerdictChip } from "./VerdictChip";

const startedAt = "2026-09-01T09:00:00.000Z";

const base: CheckpointDto = {
	id: "cp1",
	projectId: "p1",
	stepId: "step-3",
	stageName: "Prototyping",
	order: 2,
	status: CheckpointStatus.Active,
	goal: "A playable vertical slice with two tide states and one boss encounter.",
	curatorKind: CheckpointCuratorKind.AI,
	curator: null,
	startedAt,
	dueAt: "2026-09-28T09:00:00.000Z",
	goalAgreedAt: "2026-09-01T15:00:00.000Z",
	revisedAt: null,
	revisedNote: null,
	midNote: null,
	summary: null,
	verdict: null,
	verdictNote: null,
	decidedAt: null,
	acceptedTermsAt: "2026-09-01T08:55:00.000Z",
	createdAt: "2026-09-01T08:40:00.000Z",
	updatedAt: "2026-09-14T09:00:00.000Z",
	items: [],
	day: 14,
	daysLeft: 14,
};

const meta: Meta = { title: "Checkpoints/Pieces" };

export default meta;

export const Verdicts: StoryObj = {
	render: () => (
		<Flex gap={24}>
			<VerdictChip verdict={CheckpointVerdict.StageClosed} />
			<VerdictChip verdict={CheckpointVerdict.GoalMet} />
			<VerdictChip verdict={CheckpointVerdict.GoalMissed} />
		</Flex>
	),
};

export const Curators: StoryObj = {
	render: () => (
		<Flex gap={24}>
			<CuratorBadge kind={CheckpointCuratorKind.AI} />
			<CuratorBadge
				kind={CheckpointCuratorKind.Human}
				curator={{ name: "Marta Ilves", image: null }}
			/>
		</Flex>
	),
};

/** The day is a chip; the verdict and the waiting states are dots. */
export const StatusSlot: StoryObj = {
	render: () => (
		<Flex gap={24}>
			<CheckpointStatusSlot checkpoint={base} />
			<CheckpointStatusSlot
				checkpoint={{ ...base, status: CheckpointStatus.Review }}
			/>
			<CheckpointStatusSlot
				checkpoint={{
					...base,
					status: CheckpointStatus.Closed,
					verdict: CheckpointVerdict.StageClosed,
				}}
			/>
			<CheckpointStatusSlot
				checkpoint={{ ...base, status: CheckpointStatus.Draft, day: null }}
			/>
		</Flex>
	),
};

export const RunningCard: StoryObj = {
	render: () => <CheckpointCard checkpoint={base} projectSlug="neon-drift" />,
};

/** Nothing charged, no days counting, and a way back into the flow. */
export const DraftCard: StoryObj = {
	render: () => (
		<CheckpointCard
			checkpoint={{
				...base,
				status: CheckpointStatus.Draft,
				goal: "",
				startedAt: null,
				dueAt: null,
				day: null,
				daysLeft: null,
			}}
			projectSlug="neon-drift"
			onDiscard={() => {}}
		/>
	),
};

export const AwaitingVerdict: StoryObj = {
	render: () => (
		<CheckpointCard
			checkpoint={{
				...base,
				status: CheckpointStatus.Review,
				day: 28,
				daysLeft: 0,
				curatorKind: CheckpointCuratorKind.Human,
				curator: { id: "u1", name: "Marta Ilves", image: null },
			}}
			projectSlug="neon-drift"
		/>
	),
};

const devlog = (
	id: string,
	publishedAt: string,
	content: string,
	answer?: string,
) => ({
	id,
	publishedAt,
	content,
	curatorFeedback: answer ?? null,
	curatorFeedbackAt: answer ? "2026-09-08T06:00:00.000Z" : null,
	sprint: sprintOfDate(new Date(startedAt), new Date(publishedAt)),
});

/** The path, mid-checkpoint: sprint 2 is where the author lives today. */
export const Path: StoryObj = {
	render: () => (
		<CheckpointPath
			selected="sprint-2"
			onSelect={() => {}}
			next={{ disabled: true, reason: "Opens when the verdict is in." }}
			steps={[
				{
					key: "inputs",
					label: "Inputs",
					meta: "what was bought",
					glyph: "start",
				},
				{ key: "sprint-1", label: "Sprint 1", meta: "1–7 Sep", glyph: "done" },
				{
					key: "sprint-2",
					label: "Sprint 2",
					meta: "8–14 Sep",
					glyph: "current",
					needsYou: true,
				},
				{
					key: "sprint-3",
					label: "Sprint 3",
					meta: "15–21 Sep",
					glyph: "ahead",
				},
				{
					key: "sprint-4",
					label: "Sprint 4",
					meta: "22–28 Sep",
					glyph: "ahead",
				},
				{
					key: "checkpoint",
					label: "Checkpoint",
					meta: "28 Sep",
					glyph: "locked",
				},
			]}
		/>
	),
};

/** Before it is paid for: every step after the first is undated and grey. */
export const PathBeforePayment: StoryObj = {
	render: () => (
		<CheckpointPath
			selected="inputs"
			onSelect={() => {}}
			footNote="The dates appear once it is paid and the day it starts is set."
			steps={[
				{
					key: "inputs",
					label: "Prepare",
					meta: "buying the 28 days",
					glyph: "current",
				},
				{ key: "sprint-1", label: "Sprint 1", glyph: "ahead" },
				{ key: "sprint-2", label: "Sprint 2", glyph: "ahead" },
				{ key: "sprint-3", label: "Sprint 3", glyph: "ahead" },
				{ key: "sprint-4", label: "Sprint 4", glyph: "ahead" },
				{ key: "checkpoint", label: "Checkpoint", glyph: "locked" },
			]}
		/>
	),
};

/** What a sprint still asks, and who it waits on. */
export const Asks: StoryObj = {
	render: () => (
		<AskPanel
			title="What this sprint asks of you"
			info="Everything still open in this sprint, and who it waits on."
			count="2 open"
			rows={[
				{
					key: "scope",
					glyph: "open",
					title: "Check the scope",
					owner: "You",
					due: "due today",
					dueUrgent: true,
					meta: "Three of four outcomes have nothing claimed against them.",
				},
				{
					key: "marks",
					glyph: "todo",
					title: "A mark is missing",
					owner: "Team",
					due: "4 of 5",
					meta: "Lena Novak",
				},
			]}
		/>
	),
};

/** Answered: the head turns green and the forward button unlocks. */
export const AsksNothingOpen: StoryObj = {
	render: () => (
		<AskPanel
			title="What this sprint asks of you"
			count="nothing open"
			countDone
			rows={[
				{
					key: "none",
					glyph: "done",
					title: "Nothing is waiting on anyone",
					meta: "The devlog is in, the review is in, and five of five marked the sprint.",
				},
			]}
		/>
	),
};
