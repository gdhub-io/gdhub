import type { Meta, StoryObj } from "@storybook/nextjs";
import { Flex } from "antd";
import {
	CheckpointCuratorKind,
	CheckpointStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointCard } from "./CheckpointCard";
import { CheckpointStatusSlot } from "./CheckpointStatusSlot";
import { CheckpointThread } from "./CheckpointThread";
import { CuratorBadge } from "./CuratorBadge";
import { VerdictChip } from "./VerdictChip";

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
	startedAt: "2026-09-01T09:00:00.000Z",
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
});

/** Under way: what has happened, one line each, the bodies behind a chevron. */
export const ThreadUnderWay: StoryObj = {
	render: () => (
		<CheckpointThread
			checkpoint={{
				...base,
				goalAgreedAt: "2026-09-01T15:00:00.000Z",
				midNote:
					"Three of four outcomes have nothing claimed against them, and half the calendar is gone. What do you want to change?",
				reports: [
					devlog(
						"r1",
						"2026-09-07T10:00:00.000Z",
						"Tide states\nTwo of three are in with placeholder art.",
						"Art on state one moves the tide outcome. The save system is still untouched.",
					),
					devlog(
						"r2",
						"2026-09-13T10:00:00.000Z",
						"A save bug we cannot reproduce",
					),
				],
			}}
		/>
	),
};

/** Closed: the verdict is the newest entry, with the report under it. */
export const ThreadClosed: StoryObj = {
	render: () => (
		<CheckpointThread
			checkpoint={{
				...base,
				status: CheckpointStatus.Closed,
				verdict: CheckpointVerdict.StageClosed,
				verdictNote: "Outcomes delivered and the stage's requirements met.",
				summary:
					"The prototype exists and a stranger finished it. Three tide states are in with art; the trailer was cut on day 14 with the reason recorded.",
				decidedAt: "2026-09-29T08:00:00.000Z",
				goalAgreedAt: "2026-09-01T15:00:00.000Z",
				reports: [
					devlog(
						"r1",
						"2026-09-27T10:00:00.000Z",
						"Two strangers finished it, 14 and 17 minutes",
					),
				],
			}}
		/>
	),
};
